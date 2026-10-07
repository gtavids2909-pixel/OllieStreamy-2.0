"""
Minimal HLS proxy.

Problem: a lot of IPTV m3u8 URLs respond fine to a plain `curl` but block the
browser because of:
    * missing `Access-Control-Allow-Origin`
    * strict `Referer` / `User-Agent` whitelists set at the CDN
    * mixed-content HTTP streams loaded from an HTTPS page

This proxy fetches the stream on the backend (where we fully control headers),
rewrites any URLs inside an m3u8 playlist so segment loads go back through the
proxy, and streams the response to the browser with permissive CORS.

The proxy accepts up to ~10 MB per segment; longer HLS live edges are chunked
by the client so this is more than enough.
"""
from __future__ import annotations

import base64
import re
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

router = APIRouter()
_URI_RE = re.compile(r"URI=([\"'])(.*?)\1")

TIMEOUT = httpx.Timeout(20.0, connect=10.0)
MAX_CHUNK = 1024 * 1024  # 1 MB streaming chunks
DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# Common HLS/MPEG content types that we always serve back as streams.
STREAM_MIMES = (
    "application/vnd.apple.mpegurl",
    "application/x-mpegurl",
    "application/octet-stream",
    "video/mp2t",
    "video/mp4",
    "audio/aac",
    "audio/mp4",
)


def _b64url_decode(s: str) -> str:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode()).decode()


def _b64url_encode(s: str) -> str:
    return base64.urlsafe_b64encode(s.encode()).rstrip(b"=").decode()


def _build_proxy_url(target_url: str, ua: str, ref: str) -> str:
    """Make a self-referencing proxy URL for an inner playlist/segment.

    We return a path-only URL (no host) so hls.js resolves it against the
    manifest's origin (which is the public preview/prod host, not the internal
    cluster hostname that FastAPI sees).
    """
    u = _b64url_encode(target_url)
    extras = []
    if ua:
        extras.append(f"ua={_b64url_encode(ua)}")
    if ref:
        extras.append(f"ref={_b64url_encode(ref)}")
    q = "&".join([f"u={u}"] + extras)
    return f"/api/livetv/proxy?{q}"


def _rewrite_m3u8(text: str, base_url: str, ua: str, ref: str) -> str:
    """
    Rewrite every URI line / tag inside an m3u8 playlist to go through our
    proxy. HLS playlists are plain-text so a line-by-line pass is enough.
    """
    out_lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            out_lines.append(raw)
            continue
        if line.startswith("#"):
            if "URI=" in line:
                line = _URI_RE.sub(
                    lambda m: f'URI="{_build_proxy_url(urljoin(base_url, m.group(2)), ua, ref)}"', line
                )
            out_lines.append(line)
            continue
        abs_url = urljoin(base_url, line)
        out_lines.append(_build_proxy_url(abs_url, ua, ref))
    return "\n".join(out_lines)


def _is_playlist_head(buf: bytes) -> bool:
    head = buf[:512].lstrip(b"\xef\xbb\xbf \r\n\t")
    return head.startswith(b"#EXTM3U")


async def _open_upstream(client: httpx.AsyncClient, target: str, headers: dict):
    """
    Open the upstream request. Many IPTV CDNs reject a wrong Referer/Origin or a
    custom UA, so on 401/403/404-ish failures we retry once with progressively
    simpler headers before giving up.
    """
    attempts = [headers]
    if "Referer" in headers:
        h2 = {k: v for k, v in headers.items() if k not in ("Referer", "Origin")}
        attempts.append(h2)
    if headers.get("User-Agent") != DEFAULT_UA:
        h3 = {**attempts[-1], "User-Agent": DEFAULT_UA}
        attempts.append(h3)

    last_exc: Optional[Exception] = None
    last_resp = None
    for h in attempts:
        try:
            resp = await client.send(client.build_request("GET", target, headers=h), stream=True)
        except Exception as e:  # noqa: BLE001
            last_exc = e
            continue
        if resp.status_code < 400:
            if last_resp is not None:
                await last_resp.aclose()
            return resp
        if last_resp is not None:
            await last_resp.aclose()
        last_resp = resp
    if last_resp is not None:
        return last_resp
    raise last_exc or RuntimeError("upstream unreachable")


@router.get("/livetv/proxy")
async def livetv_proxy(request: Request, u: str, ua: Optional[str] = None, ref: Optional[str] = None):
    try:
        target = _b64url_decode(u)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid url")
    parsed = urlparse(target)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="unsupported url")

    user_agent = _b64url_decode(ua) if ua else DEFAULT_UA
    referrer = _b64url_decode(ref) if ref else ""

    headers = {"User-Agent": user_agent, "Accept": "*/*"}
    if referrer:
        headers["Referer"] = referrer
        headers["Origin"] = f"{urlparse(referrer).scheme}://{urlparse(referrer).netloc}"
    # Forward Range for seekable/VOD-style segments.
    if request.headers.get("range"):
        headers["Range"] = request.headers["range"]

    client = httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True)
    try:
        upstream = await _open_upstream(client, target, headers)
    except Exception as e:  # noqa: BLE001
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"upstream error: {e!s}")

    if upstream.status_code >= 400:
        code = upstream.status_code
        await upstream.aclose()
        await client.aclose()
        raise HTTPException(status_code=code, detail="upstream error")

    content_type = (upstream.headers.get("content-type") or "").split(";")[0].strip().lower()
    final_url = str(upstream.url)  # after redirects — needed to resolve relative URIs

    # Decide whether this is a playlist. Don't trust the extension (query strings,
    # tokens) or the content-type (many servers send text/plain or octet-stream).
    obvious_segment = content_type in ("video/mp2t", "video/mp4", "audio/aac", "audio/mp4", "video/iso.segment") \
        or final_url.lower().split("?")[0].endswith((".ts", ".m4s", ".aac", ".mp4", ".key"))
    maybe_playlist = (
        "mpegurl" in content_type
        or final_url.lower().split("?")[0].endswith((".m3u8", ".m3u"))
        or content_type in ("text/plain", "application/octet-stream", "")
        or "text/" in content_type
    ) and not obvious_segment

    if maybe_playlist:
        # Read a bounded amount: playlists are small; a real segment mislabelled as
        # octet-stream would be huge so we cap the sniff and fall through to streaming.
        buf = b""
        async for chunk in upstream.aiter_bytes(64 * 1024):
            buf += chunk
            if len(buf) > 2 * 1024 * 1024:
                break
        if _is_playlist_head(buf):
            await upstream.aclose()
            await client.aclose()
            text = buf.decode("utf-8", errors="ignore")
            rewritten = _rewrite_m3u8(text, final_url, user_agent, referrer)
            return Response(
                content=rewritten,
                media_type="application/vnd.apple.mpegurl",
                headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"},
            )

        # Not a playlist after all — replay what we've buffered, then the rest.
        async def _replay():
            try:
                yield buf
                async for chunk in upstream.aiter_bytes(MAX_CHUNK):
                    yield chunk
            finally:
                await upstream.aclose()
                await client.aclose()

        return StreamingResponse(
            _replay(),
            media_type=content_type or "application/octet-stream",
            headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"},
        )

    async def _gen():
        try:
            async for chunk in upstream.aiter_bytes(MAX_CHUNK):
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    out_headers = {"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"}
    for h in ("content-range", "accept-ranges"):
        if upstream.headers.get(h):
            out_headers[h] = upstream.headers[h]
    return StreamingResponse(
        _gen(),
        status_code=206 if upstream.status_code == 206 else 200,
        media_type=content_type or "application/octet-stream",
        headers=out_headers,
    )
