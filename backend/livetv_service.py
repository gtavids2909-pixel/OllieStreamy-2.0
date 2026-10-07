"""
Live-TV catalog powered by iptv-org (https://github.com/iptv-org/iptv).

iptv-org publishes 30k+ live channels and 18k+ working stream URLs organized by
country and category. We proxy their JSON API and cache it in MongoDB with a
24h TTL so pages load instantly after the first sync.

After each catalog sync we kick off a background health-check that probes
every stream URL and marks each one as alive / dead so the frontend only ever
offers working mirrors first.

Data endpoints we consume:
    /api/channels.json   - metadata (id, name, country, categories, …)
    /api/streams.json    - { channel, url, quality, user_agent, referrer, … }
    /api/countries.json  - { code, name, flag, languages }
    /api/categories.json - { id, name, description }
    /api/logos.json      - { channel, url, width, height }
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from sports import annotate

API_BASE = "https://iptv-org.github.io/api"
FETCH_TIMEOUT = httpx.Timeout(60.0, connect=15.0)
PROBE_TIMEOUT = httpx.Timeout(6.0, connect=4.0)
CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 h
PROBE_CONCURRENCY = 40             # keep API responsive during probe
PRIORITY_RECHECK_SECONDS = 15 * 60  # sports / event / recently-offline channels
PRIORITY_CATEGORIES = {"sports", "events", "live", "news"}  # channels that go on/off air
EXTRA_M3U_ENV = "LIVETV_EXTRA_M3U"  # comma-separated extra .m3u playlist URLs
DEFAULT_EXTRA_M3U = [
    "https://iptv-org.github.io/iptv/index.m3u",
    "https://iptv-org.github.io/iptv/index.country.m3u",
    "https://iptv-org.github.io/iptv/index.category.m3u",
    "https://iptv-org.github.io/iptv/index.language.m3u",
    "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
    # Official free ad-supported (FAST) services, generated from their public channel APIs
    "https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plutotv_all.m3u",
    "https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/samsungtvplus_all.m3u",
    "https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/plex_all.m3u",
    "https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/main/playlists/roku_all.m3u",
]
ADULT_WORDS = ("xxx", "adult", "porn", "erotic", "18+")
HD_QUALITIES = {"720p", "1080p", "2160p"}
DEAD_DAYS = 3  # consecutive daily probes a stream may fail before it is dropped

logger = logging.getLogger(__name__)
# Silence httpx's per-request INFO lines so a 16k-stream probe doesn't flood logs.
logging.getLogger("httpx").setLevel(logging.WARNING)


class LiveTVService:
    """
    Lazily hydrates a MongoDB-backed catalog from iptv-org and serves filtered
    channel queries. Call `.ensure_fresh(db)` from any endpoint before reading.
    """

    def __init__(self):
        self._lock = asyncio.Lock()

    async def ensure_fresh(self, db) -> Dict[str, Any]:
        """
        Make sure the catalog has been refreshed in the last 24 h. Safe to call
        on every request — only one real sync runs at a time.
        """
        now = datetime.now(timezone.utc)

        def _age(meta):
            ts = (meta or {}).get("ts")
            if not ts:
                return None
            # Mongo returns naive UTC datetimes — normalize before subtracting.
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return (now - ts).total_seconds()

        meta = await db.livetv_meta.find_one({"_id": "last_sync"})
        age = _age(meta)
        if age is not None and age < CACHE_TTL_SECONDS:
            return {"status": "fresh", "age_seconds": int(age), **meta.get("stats", {})}

        async with self._lock:
            meta = await db.livetv_meta.find_one({"_id": "last_sync"})
            age = _age(meta)
            if age is not None and age < CACHE_TTL_SECONDS:
                return {"status": "fresh", "age_seconds": int(age), **meta.get("stats", {})}
            stats = await self._sync(db)
            await db.livetv_meta.update_one(
                {"_id": "last_sync"},
                {"$set": {"ts": datetime.now(timezone.utc), "stats": stats}},
                upsert=True,
            )
            return {"status": "synced", "age_seconds": 0, **stats}

    async def _sync(self, db) -> Dict[str, int]:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT, follow_redirects=True) as client:
            channels, streams, countries, categories, logos = await asyncio.gather(
                _get(client, "channels.json"),
                _get(client, "streams.json"),
                _get(client, "countries.json"),
                _get(client, "categories.json"),
                _get(client, "logos.json"),
            )

        # Index streams by channel id so we can bundle them per channel.
        streams_by_ch: Dict[str, List[dict]] = {}
        for s in streams:
            ch = s.get("channel")
            url = s.get("url")
            if not ch or not url:
                continue
            streams_by_ch.setdefault(ch, []).append(
                {
                    "url": url,
                    "quality": s.get("quality") or "",
                    "title": s.get("title") or "",
                    "user_agent": s.get("user_agent") or "",
                    "referrer": s.get("referrer") or "",
                }
            )

        # ---- Gather streams that have no iptv-org channel record ("orphans") ----
        channel_ids = {c.get("id") for c in channels if c.get("id")}
        orphans: List[dict] = []
        for st in streams:
            if st.get("channel") or not st.get("url"):
                continue
            orphans.append({
                "name": (st.get("title") or "").strip(), "url": st["url"], "tvg_id": "",
                "logo": "", "group": "", "user_agent": st.get("user_agent") or "",
                "referrer": st.get("referrer") or "",
            })

        # ---- Extra playlists: defaults + $LIVETV_EXTRA_M3U ----
        custom = [d["_id"] async for d in db.livetv_playlists.find({}, {"_id": 1})]
        extra_urls = list(dict.fromkeys(list(DEFAULT_EXTRA_M3U) + [
            u.strip() for u in os.environ.get(EXTRA_M3U_ENV, "").split(",") if u.strip()
        ] + custom))
        playlist_results: Dict[str, dict] = {}
        failed_playlists: List[str] = []
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT, follow_redirects=True) as xc:
            for extra_url in extra_urls:
                try:
                    r = await xc.get(extra_url)
                    r.raise_for_status()
                    entries = parse_m3u(r.text)
                except Exception:
                    logger.warning("livetv: extra playlist failed, skipping: %s", extra_url)
                    failed_playlists.append(extra_url)
                    playlist_results[extra_url] = {"ok": False, "error": "download or parse failed"}
                    continue
                added = 0
                for ent in entries:
                    if ent["tvg_id"] and ent["tvg_id"].split("@")[0] in channel_ids:
                        streams_by_ch.setdefault(ent["tvg_id"].split("@")[0], []).append(
                            {"url": ent["url"], "quality": "", "title": ent["name"],
                             "user_agent": ent["user_agent"], "referrer": ent["referrer"]}
                        )
                    else:
                        orphans.append(ent)
                    added += 1
                logger.info("livetv: %s -> %d entries", extra_url, added)
                playlist_results[extra_url] = {"ok": True, "entries": added}

        # Streams that failed DEAD_DAYS daily checks in a row are permanently broken — skip them.
        broken = {h["_id"] async for h in db.livetv_stream_health.find({"dead_runs": {"$gte": DEAD_DAYS}}, {"_id": 1})}
        if broken:
            streams_by_ch = {k: [x for x in v if x.get("url") not in broken] for k, v in streams_by_ch.items()}
            orphans = [o for o in orphans if o.get("url") not in broken]
            logger.info("livetv: skipping %d permanently dead streams", len(broken))

        # Pick the "in_use" logo per channel, else the widest.
        logos_by_ch: Dict[str, str] = {}
        for lg in logos:
            ch = lg.get("channel")
            if not ch:
                continue
            url = lg.get("url")
            if not url:
                continue
            prev = logos_by_ch.get(ch)
            if lg.get("in_use") or not prev:
                logos_by_ch[ch] = url

        countries_by_code = {c["code"]: c for c in countries if c.get("code")}
        categories_by_id = {c["id"]: c for c in categories if c.get("id")}

        # Build the final channel documents. Only keep channels that actually
        # have a working stream — the user explicitly asked for live content
        # only, no "empty rows". Streams are stored as a list; each has an
        # `alive` field that the background probe fills in later.
        now = datetime.now(timezone.utc)
        docs = []
        for ch in channels:
            if ch.get("is_nsfw"):
                continue
            cid = ch.get("id")
            if not cid:
                continue
            raw_streams = streams_by_ch.get(cid) or []
            if not raw_streams:
                continue

            # Dedupe by URL so we don't get the same mirror three times.
            seen_urls = set()
            unique_streams = []
            for s in raw_streams:
                u = s.get("url")
                if not u or u in seen_urls:
                    continue
                seen_urls.add(u)
                unique_streams.append({**s, "alive": None, "checked_at": None})

            cc = ch.get("country") or ""
            country = countries_by_code.get(cc, {})
            cats = [categories_by_id.get(c, {}).get("name") or c for c in (ch.get("categories") or [])]
            docs.append(
                {
                    "_id": cid,
                    "name": ch.get("name") or cid,
                    "alt_names": ch.get("alt_names") or [],
                    "network": ch.get("network") or "",
                    "country": cc,
                    "country_name": country.get("name") or cc,
                    "country_flag": country.get("flag") or "",
                    "category_ids": ch.get("categories") or [],
                    "categories": cats,
                    "logo": logos_by_ch.get(cid) or "",
                    "streams": unique_streams,
                    "updated_at": now.isoformat(),
                }
            )

        # ---- Turn orphan streams into channels (grouped by name + country) ----
        import hashlib
        seen_urls_global = {st["url"] for d in docs for st in d["streams"]}
        groups: Dict[str, dict] = {}
        code_by_name = {(c.get("name") or "").lower(): code for code, c in countries_by_code.items()}
        code_by_name.update({"united states": "US", "usa": "US", "united kingdom": "UK", "uk": "UK"})
        for ent in orphans:
            url = (ent.get("url") or "").strip()
            name = (ent.get("name") or "").strip()
            if not url or not name or url in seen_urls_global:
                continue
            if not url.lower().startswith(("http://", "https://")):
                continue
            group_txt = (ent.get("group") or "").lower()
            if any(w in group_txt or w in name.lower() for w in ADULT_WORDS):
                continue
            tid = (ent.get("tvg_id") or "").split("@")[0]
            m = re.search(r"\.([a-z]{2})$", tid, re.I)
            cc = (m.group(1).upper() if m else "XX")
            cc = "UK" if cc == "GB" else cc
            gcc = code_by_name.get(group_txt.strip())
            if gcc:  # FAST / per-country playlists put the country in group-title
                cc, group_txt = gcc, ""
            key = f"{re.sub(r'[^a-z0-9]+', '', name.lower())}|{cc}"
            g = groups.setdefault(key, {
                "name": name, "cc": cc, "logo": ent.get("logo") or "",
                "cats": set(), "streams": [],
            })
            for c in re.split(r"[;,]", group_txt):
                c = c.strip()
                if c and len(c) < 24:
                    g["cats"].add(c)
            if not g["logo"]:
                g["logo"] = ent.get("logo") or ""
            g["streams"].append({
                "url": url, "quality": "", "title": name,
                "user_agent": ent.get("user_agent") or "", "referrer": ent.get("referrer") or "",
                "alive": None, "checked_at": None,
            })
            seen_urls_global.add(url)

        for key, g in groups.items():
            cc = g["cc"]
            country = countries_by_code.get(cc, {})
            cat_ids = sorted(g["cats"])
            docs.append({
                "_id": "x:" + hashlib.sha1(key.encode()).hexdigest()[:14],
                "name": g["name"], "alt_names": [], "network": "",
                "country": cc,
                "country_name": country.get("name") or ("Other / Unsorted" if cc == "XX" else cc),
                "country_flag": country.get("flag") or ("🌐" if cc == "XX" else ""),
                "category_ids": cat_ids,
                "categories": [categories_by_id.get(c, {}).get("name") or c.title() for c in cat_ids],
                "logo": g["logo"], "streams": g["streams"][:12],
                "updated_at": now.isoformat(),
            })
        logger.info("livetv: %d total channels after merging extra sources", len(docs))

        for d in docs:
            annotate(d)
        logos_fixed = _clear_shared_logos(docs)

        # Wipe and re-insert the catalog in bulk (keeps the collection in sync
        # with upstream — no stale ids ever lingering).
        await db.livetv_channels.delete_many({})
        if docs:
            # Insert in batches to stay well under Mongo's 16 MB message cap.
            batch = 2000
            for i in range(0, len(docs), batch):
                await db.livetv_channels.insert_many(docs[i : i + batch])

        await db.livetv_meta.update_one(
            {"_id": "playlist_status"},
            {"$set": {"failed": failed_playlists, "sources": extra_urls, "results": playlist_results,
                      "logos_fixed": logos_fixed, "ts": now.isoformat()}},
            upsert=True,
        )

        # Country + category summaries for the sidebar.
        country_counts: Dict[str, int] = {}
        category_counts: Dict[str, int] = {}
        for d in docs:
            country_counts[d["country"]] = country_counts.get(d["country"], 0) + 1
            for cid in d["category_ids"]:
                category_counts[cid] = category_counts.get(cid, 0) + 1

        country_docs = [
            {
                "_id": code,
                "name": countries_by_code.get(code, {}).get("name") or code,
                "flag": countries_by_code.get(code, {}).get("flag") or "",
                "count": country_counts[code],
            }
            for code in country_counts
        ]
        category_docs = [
            {
                "_id": cid,
                "name": categories_by_id.get(cid, {}).get("name") or cid,
                "count": category_counts[cid],
            }
            for cid in category_counts
        ]

        await db.livetv_countries.delete_many({})
        if country_docs:
            await db.livetv_countries.insert_many(country_docs)
        await db.livetv_categories.delete_many({})
        if category_docs:
            await db.livetv_categories.insert_many(category_docs)

        return {
            "channels": len(docs),
            "countries": len(country_docs),
            "categories": len(category_docs),
        }

    # ----------------------------- queries ------------------------------
    async def list_countries(self, db, include_offline: bool = False, status: Optional[str] = None,
                             pcat: Optional[str] = None, sport: Optional[str] = None) -> List[dict]:
        """
        Country index. We re-count channels against the live-streams filter so
        the sidebar numbers match what the user actually sees when they expand
        a country. This also hides countries that are 100 % dead.
        """
        match = {} if include_offline else {"streams": {"$elemMatch": {"alive": {"$ne": False}}}}
        if status:
            match = dict(STATUS_QUERY.get(status, {}))
        if pcat:
            match["primary_category"] = pcat
        if sport:
            match["sport"] = sport
        pipeline = [
            {"$match": match},
            {
                "$group": {
                    "_id": "$country",
                    "name": {"$first": "$country_name"},
                    "flag": {"$first": "$country_flag"},
                    "count": {"$sum": 1},
                }
            },
            {"$match": {"count": {"$gt": 0}}},
            {"$sort": {"name": 1}},
        ]
        return [
            {"code": r["_id"], "name": r.get("name") or r["_id"], "flag": r.get("flag") or "", "count": r["count"]}
            async for r in db.livetv_channels.aggregate(pipeline)
        ]

    async def list_categories(self, db, include_offline: bool = False) -> List[dict]:
        match = {} if include_offline else {"streams": {"$elemMatch": {"alive": {"$ne": False}}}}
        pipeline = [
            {"$match": match},
            {"$unwind": "$category_ids"},
            {
                "$group": {
                    "_id": "$category_ids",
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]
        # Resolve friendly names via the categories collection
        name_lookup: Dict[str, str] = {}
        async for c in db.livetv_categories.find({}, {"_id": 1, "name": 1}):
            name_lookup[c["_id"]] = c.get("name") or c["_id"]
        return [
            {"id": r["_id"], "name": name_lookup.get(r["_id"], r["_id"]), "count": r["count"]}
            async for r in db.livetv_channels.aggregate(pipeline)
        ]

    async def list_channels(
        self,
        db,
        country: Optional[str] = None,
        category: Optional[str] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 60,
        include_offline: bool = False,
        sport: Optional[str] = None,
        pcat: Optional[str] = None,
        status: Optional[str] = None,
    ) -> dict:
        query: Dict[str, Any] = {}
        if sport:
            query["sport"] = sport
        if pcat:
            query["primary_category"] = pcat
        if country:
            query["country"] = country.upper()
        if category:
            query["category_ids"] = category.lower()
        if q and q.strip():
            query["$or"] = [
                {"name": {"$regex": q.strip(), "$options": "i"}},
                {"alt_names": {"$regex": q.strip(), "$options": "i"}},
                {"network": {"$regex": q.strip(), "$options": "i"}},
            ]
        # Only surface channels that still have at least one non-dead mirror.
        # `alive` is None for unchecked (early after sync) and True/False after
        # probing — we hide only the fully-dead rows.
        # With include_offline the user also sees channels that are off-air right
        # now (e.g. a sports channel between events) — they are re-probed often and
        # on open, so they work as soon as the broadcast starts.
        if status:
            query.update(STATUS_QUERY.get(status, {}))
        elif not include_offline:
            query["streams"] = {"$elemMatch": {"alive": {"$ne": False}}}
        total = await db.livetv_channels.count_documents(query)
        skip = max(0, (page - 1) * page_size)
        cur = db.livetv_channels.aggregate([
            {"$match": query},
            {"$addFields": {"_alive": {"$size": {"$filter": {
                "input": "$streams", "as": "s", "cond": {"$eq": ["$$s.alive", True]}}}}}},
            {"$sort": {"_alive": -1, "name": 1, "_id": 1}},
            {"$skip": skip},
            {"$limit": page_size},
        ], allowDiskUse=True)
        items = []
        async for d in cur:
            streams = d.get("streams", [])
            alive = sum(1 for s in streams if s.get("alive") is True)
            items.append(
                {
                    "id": d["_id"],
                    "name": d["name"],
                    "network": d.get("network", ""),
                    "country": d.get("country", ""),
                    "country_name": d.get("country_name", ""),
                    "country_flag": d.get("country_flag", ""),
                    "categories": d.get("categories", []),
                    "sport": d.get("sport"),
                    "primary_category": d.get("primary_category"),
                    "logo": d.get("logo", ""),
                    "stream_count": len(streams),
                    "alive_count": alive,
                    "hd": any((st.get("quality") or "").lower() in HD_QUALITIES for st in streams),
                    "offline": not any(st.get("alive") is not False for st in streams),
                }
            )
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": skip + len(items) < total,
        }

    async def facets(self, db, status: str = "live", country: Optional[str] = None) -> dict:
        base: Dict[str, Any] = {"country": country.upper()} if country else {}
        q = {**base, **STATUS_QUERY.get(status, {})}
        out = {"status": {}, "sports": {}, "categories": {}}
        for k, sq in STATUS_QUERY.items():
            out["status"][k] = await db.livetv_channels.count_documents({**base, **sq})
        async for row in db.livetv_channels.aggregate([
            {"$match": q},
            {"$facet": {
                "sports": [{"$match": {"sport": {"$ne": None}}}, {"$group": {"_id": "$sport", "n": {"$sum": 1}}}],
                "categories": [{"$group": {"_id": "$primary_category", "n": {"$sum": 1}}}],
            }},
        ]):
            out["sports"] = {r["_id"]: r["n"] for r in row["sports"] if r["_id"]}
            out["categories"] = {r["_id"]: r["n"] for r in row["categories"] if r["_id"]}
        return out

    async def reannotate(self, db) -> dict:
        docs = [d async for d in db.livetv_channels.find({}, {"name": 1, "alt_names": 1, "category_ids": 1, "logo": 1})]
        for d in docs:
            annotate(d)
        fixed = _clear_shared_logos(docs)
        from pymongo import UpdateOne
        ops = [UpdateOne({"_id": d["_id"]}, {"$set": {"sport": d["sport"], "primary_category": d["primary_category"], "logo": d.get("logo", "")}}) for d in docs]
        for i in range(0, len(ops), 2000):
            await db.livetv_channels.bulk_write(ops[i:i + 2000], ordered=False)
        return {"channels": len(docs), "logos_fixed": fixed}

    async def get_channel(self, db, channel_id: str) -> Optional[dict]:
        d = await db.livetv_channels.find_one({"_id": channel_id})
        if not d:
            return None
        streams = d.get("streams", []) or []

        # Drop fully-dead mirrors; keep alive and unchecked (unchecked = fresh
        # sync not yet probed).
        offline = not any(s.get("alive") is not False for s in streams)
        # Keep every mirror (a scheduled channel may have just gone live) but order
        # proven-alive first, then unchecked, then dead.
        kept = sorted(streams, key=lambda s: {True: 0, None: 1}.get(s.get("alive"), 2))

        # Deduplicate repeated quality labels — iptv-org marks most streams
        # "1080p" even when they differ, so attach a mirror index for clarity.
        import base64 as _b64

        def _b64url(s: str) -> str:
            return _b64.urlsafe_b64encode(s.encode()).rstrip(b"=").decode()

        seen_q: Dict[str, int] = {}
        for i, s in enumerate(kept):
            quality = (s.get("quality") or "").strip() or "SD"
            seen_q[quality] = seen_q.get(quality, 0) + 1
            s["mirror_index"] = i + 1
            s["label"] = (
                f"Mirror {i + 1} · {quality}" if seen_q[quality] > 1 or len(kept) > 1 else quality
            )
            # Pre-build the proxy URL the frontend should use for playback.
            parts = [f"u={_b64url(s['url'])}"]
            if s.get("user_agent"):
                parts.append(f"ua={_b64url(s['user_agent'])}")
            if s.get("referrer"):
                parts.append(f"ref={_b64url(s['referrer'])}")
            s["proxy_url"] = "/api/livetv/proxy?" + "&".join(parts)
        return {
            "id": d["_id"],
            "name": d["name"],
            "alt_names": d.get("alt_names", []),
            "network": d.get("network", ""),
            "country": d.get("country", ""),
            "country_name": d.get("country_name", ""),
            "country_flag": d.get("country_flag", ""),
            "categories": d.get("categories", []),
            "logo": d.get("logo", ""),
            "offline": offline,
            "streams": kept,
        }

    async def recheck_channel(self, db, channel_id: str) -> None:
        """Probe every mirror of one channel right now (used when a user opens it)."""
        d = await db.livetv_channels.find_one({"_id": channel_id}, {"streams": 1})
        if not d:
            return
        now = datetime.now(timezone.utc)
        sem = asyncio.Semaphore(PROBE_CONCURRENCY)
        results: List[tuple] = []
        async with httpx.AsyncClient(timeout=PROBE_TIMEOUT, follow_redirects=True) as client:
            async def _one(i, s):
                async with sem:
                    results.append((channel_id, i, await _check_stream(client, s["url"], s.get("user_agent") or "", s.get("referrer") or "")))
            await asyncio.gather(*[_one(i, s) for i, s in enumerate(d.get("streams") or [])])
        await self._apply_probe_results(db, results, now)

    async def probe_priority(self, db) -> Dict[str, int]:
        """
        Frequent re-check of channels that come and go (sports/events/news) and of
        anything currently offline that was alive before. Runs every ~15 minutes
        from a background loop, so scheduled channels flip to LIVE shortly after
        they start broadcasting.
        """
        now = datetime.now(timezone.utc)
        cutoff = now.timestamp() - PRIORITY_RECHECK_SECONDS
        tasks = []
        # Every off-air stream + all sports/news/event channels, so anything that comes
        # back on air moves to "Live now" within ~15 minutes.
        q = {"$or": [{"category_ids": {"$in": list(PRIORITY_CATEGORIES)}}, {"sport": {"$ne": None}}, {"streams.alive": False}]}
        async for d in db.livetv_channels.find(q, {"_id": 1, "streams": 1}):
            for i, s in enumerate(d.get("streams") or []):
                ts = 0
                ca = s.get("checked_at")
                if isinstance(ca, str):
                    try:
                        ts = datetime.fromisoformat(ca).timestamp()
                    except Exception:
                        ts = 0
                if ts < cutoff:
                    tasks.append((d["_id"], i, s["url"], s.get("user_agent") or "", s.get("referrer") or ""))
        if not tasks:
            return {"probed": 0}
        sem = asyncio.Semaphore(PROBE_CONCURRENCY)
        results: List[tuple] = []
        async with httpx.AsyncClient(timeout=PROBE_TIMEOUT, follow_redirects=True) as client:
            async def _p(cid, idx, url, ua, ref):
                async with sem:
                    results.append((cid, idx, await _check_stream(client, url, ua, ref)))
            for i in range(0, len(tasks), 200):
                await asyncio.gather(*[_p(*t) for t in tasks[i:i + 200]])
                await self._apply_probe_results(db, results, now)
                results.clear()
                await asyncio.sleep(0.5)
        return {"probed": len(tasks)}

    # ----------------------------- health probes ------------------------------
    async def probe_all(self, db) -> Dict[str, int]:
        """
        Background health check for every stream URL in the catalog. Marks
        each stream as alive/dead and records when it was checked. Safe to
        run repeatedly — it only probes streams that haven't been checked
        in the last 12 hours (so a daily cron fully refreshes the labels).
        """
        now = datetime.now(timezone.utc)
        stale_cutoff = now.timestamp() - 12 * 60 * 60

        # Pull all channels into memory — we only need their _id + streams.
        docs = []
        async for d in db.livetv_channels.find({}, {"_id": 1, "streams": 1}):
            docs.append(d)

        # Build the probe queue: every stream that is either unchecked or stale.
        tasks = []
        for d in docs:
            for i, s in enumerate(d.get("streams", []) or []):
                checked_at = s.get("checked_at")
                ts = 0
                if isinstance(checked_at, str):
                    try:
                        ts = datetime.fromisoformat(checked_at).timestamp()
                    except Exception:
                        ts = 0
                if s.get("alive") is None or ts < stale_cutoff:
                    tasks.append((d["_id"], i, s["url"], s.get("user_agent") or "", s.get("referrer") or ""))

        if not tasks:
            return {"probed": 0, "alive": 0, "dead": 0}

        logger.info("livetv: probing %d streams", len(tasks))
        sem = asyncio.Semaphore(PROBE_CONCURRENCY)
        results: List[tuple] = []

        async with httpx.AsyncClient(timeout=PROBE_TIMEOUT, follow_redirects=True) as client:
            async def _probe(cid, idx, url, ua, ref):
                async with sem:
                    alive = await _check_stream(client, url, ua, ref)
                    results.append((cid, idx, alive))

            # Chunk to keep peak memory bounded and let other requests breathe.
            CHUNK = 200
            for i in range(0, len(tasks), CHUNK):
                chunk = tasks[i : i + CHUNK]
                await asyncio.gather(*[_probe(*t) for t in chunk])
                await self._apply_probe_results(db, results, now)
                results.clear()
                # Yield briefly between chunks so API endpoints stay responsive.
                await asyncio.sleep(0.5)

        # Final meta tally
        total = len(tasks)
        alive_count = 0
        dead_count = 0
        async for d in db.livetv_channels.find({}, {"streams.alive": 1}):
            for s in d.get("streams", []) or []:
                if s.get("alive") is True:
                    alive_count += 1
                elif s.get("alive") is False:
                    dead_count += 1

        if total:
            await self._record_health(db)
        return {"probed": total, "alive": alive_count, "dead": dead_count}

    @staticmethod
    async def _record_health(db) -> None:
        """Remember per-URL consecutive dead days so permanently broken streams get dropped at sync."""
        from pymongo import UpdateOne
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        alive, dead = set(), set()
        async for d in db.livetv_channels.find({}, {"streams.url": 1, "streams.alive": 1}):
            for st in d.get("streams", []) or []:
                (alive if st.get("alive") is True else dead if st.get("alive") is False else set()).add(st.get("url"))
        dead -= alive
        prev = {h["_id"]: h async for h in db.livetv_stream_health.find({"_id": {"$in": list(dead)}})}
        ops = [UpdateOne({"_id": u}, {"$set": {"dead_runs": 0, "last_alive": today, "day": today}}, upsert=True) for u in alive]
        for u in dead:
            h = prev.get(u, {})
            runs = h.get("dead_runs", 0) + (0 if h.get("day") == today else 1)
            ops.append(UpdateOne({"_id": u}, {"$set": {"dead_runs": runs, "day": today}}, upsert=True))
        for i in range(0, len(ops), 5000):
            await db.livetv_stream_health.bulk_write(ops[i:i + 5000], ordered=False)

    @staticmethod
    async def _apply_probe_results(db, results, now):
        # Bulk-upsert per channel: positional array update for each (cid, idx)
        from pymongo import UpdateOne
        ops = []
        iso = now.isoformat()
        for cid, idx, alive in results:
            ops.append(
                UpdateOne(
                    {"_id": cid},
                    {"$set": {f"streams.{idx}.alive": alive, f"streams.{idx}.checked_at": iso}},
                )
            )
        if ops:
            try:
                await db.livetv_channels.bulk_write(ops, ordered=False)
            except Exception:
                logger.exception("probe bulk_write failed")


async def _get(client: httpx.AsyncClient, path: str) -> list:
    r = await client.get(f"{API_BASE}/{path}")
    r.raise_for_status()
    return r.json()


async def _check_stream(client: httpx.AsyncClient, url: str, user_agent: str = "", referrer: str = "") -> bool:
    return (await check_stream_reason(client, url, user_agent, referrer))[0]


async def check_stream_reason(client: httpx.AsyncClient, url: str, user_agent: str = "", referrer: str = ""):
    """
    Probe one stream by actually fetching it the way a player would.

    A HEAD 200 is NOT proof a stream plays (dead CDNs often answer 200 with an HTML
    page), so we GET the playlist, require a real `#EXTM3U`, and for HLS also fetch
    the first variant / segment to confirm media is flowing. Non-HLS URLs (direct
    ts/mp4) are accepted on a 2xx video/* response.
    """
    from urllib.parse import urljoin

    headers = {
        "User-Agent": user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
    }
    if referrer:
        headers["Referer"] = referrer
    try:
        async with client.stream("GET", url, headers=headers) as r:
            if r.status_code < 200 or r.status_code >= 400:
                return False, f"HTTP {r.status_code}"
            ct = (r.headers.get("content-type") or "").lower()
            if ct.startswith(("video/", "audio/")) and "mpegurl" not in ct:
                return True, f"Direct media stream ({ct})"
            buf = b""
            async for chunk in r.aiter_bytes(4096):
                buf += chunk
                if len(buf) >= 256 * 1024:
                    break
            final = str(r.url)
    except Exception as e:
        return False, f"Request failed: {type(e).__name__}"

    text = buf.decode("utf-8", errors="ignore").lstrip("\ufeff \r\n\t")
    if not text.startswith("#EXTM3U"):
        return False, "Not a playlist (no #EXTM3U header)"

    # Find the first media URI and make sure it answers.
    first = next((ln.strip() for ln in text.splitlines() if ln.strip() and not ln.startswith("#")), None)
    if not first:
        return False, "Empty playlist (nothing on air)"
    try:
        target = urljoin(final, first)
        async with client.stream("GET", target, headers=headers) as r2:
            if r2.status_code < 200 or r2.status_code >= 400:
                return False, f"First segment failed: HTTP {r2.status_code}"
            # Variant playlists are text; segments are binary. Either is fine as long as it has bytes.
            async for chunk in r2.aiter_bytes(2048):
                if chunk:
                    return True, "Playlist OK, first segment/variant responded"
            return False, "First segment failed: empty response"
    except Exception as e:
        return False, f"First segment failed: {type(e).__name__}"


STATUS_QUERY: Dict[str, Dict[str, Any]] = {
    "live": {"streams": {"$elemMatch": {"alive": True}}},
    "offline": {"streams": {"$not": {"$elemMatch": {"alive": {"$ne": False}}}}},
    "all": {},
}


def _clear_shared_logos(docs: List[dict], threshold: int = 20) -> int:
    """Blank logos reused by many unrelated channel names (wrong/placeholder art)."""
    names: Dict[str, set] = {}
    for d in docs:
        if d.get("logo"):
            names.setdefault(d["logo"], set()).add(((d.get("name") or "").lower().split() or [""])[0])
    bad = {u for u, n in names.items() if len(n) >= threshold}
    fixed = 0
    for d in docs:
        if d.get("logo") in bad:
            d["logo"] = ""
            fixed += 1
    return fixed


_M3U_ATTR = re.compile(r'([\w-]+)="(.*?)"')


def parse_m3u(text: str) -> List[dict]:
    """Minimal #EXTINF parser -> [{name, url, tvg_id, user_agent, referrer}]."""
    out: List[dict] = []
    cur: Optional[dict] = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#EXTINF"):
            attrs = dict(_M3U_ATTR.findall(line))
            cur = {
                "name": line.rsplit(",", 1)[-1].strip(),
                "tvg_id": (attrs.get("tvg-id") or "").strip(),
                "logo": (attrs.get("tvg-logo") or "").strip(),
                "group": (attrs.get("group-title") or "").strip(),
                "user_agent": attrs.get("http-user-agent", ""),
                "referrer": attrs.get("http-referrer", ""),
            }
        elif line.startswith("#EXTVLCOPT:http-user-agent=") and cur is not None:
            cur["user_agent"] = line.split("=", 1)[1]
        elif line.startswith("#EXTVLCOPT:http-referrer=") and cur is not None:
            cur["referrer"] = line.split("=", 1)[1]
        elif line and not line.startswith("#") and cur is not None:
            cur["url"] = line
            out.append(cur)
            cur = None
    return out
