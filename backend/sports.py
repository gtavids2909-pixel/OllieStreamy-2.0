"""Sport + primary-category classification, TheSportsDB fixtures proxy, official replays."""
from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx

SPORTS = ["Football", "Basketball", "American Football", "Baseball", "Hockey", "Cricket",
          "Motorsport", "Combat", "Tennis", "Rugby", "Golf", "Other"]

# (sport, strong regex — matches on any channel, weak regex — only on sports-category channels)
_SPORT_RULES: List[Tuple[str, str, str]] = [
    ("American Football", r"\bnfl\b|american football|college football|ncaa football", r"\bncaa\b"),
    ("Basketball", r"\bnba\b|basketball|euroleague|\bbasket\b|baloncesto", r""),
    ("Baseball", r"\bmlb\b|baseball|b[eé]isbol|\bkbo\b|\bnpb\b", r""),
    ("Hockey", r"\bnhl\b|hockey|\bkhl\b", r""),
    ("Cricket", r"cricket|willow", r"star sports|sony sports|sony ten|ptv sports|ten sports|a sports|t sports"),
    ("Motorsport", r"\bf1\b|formula ?1|motogp|nascar|motorsport|indycar|motor ?sport", r"motor|racing|speed|rally|\bmav\b"),
    ("Combat", r"\bufc\b|\bmma\b|boxing|boxeo|\bwwe\b|wrestling|\baew\b|bellator|kickbox|fight network|lucha", r"fight"),
    ("Tennis", r"tennis|\batp\b|\bwta\b|wimbledon|roland garros", r""),
    ("Rugby", r"rugby|\bnrl\b", r""),
    ("Golf", r"golf|\bpga\b", r""),
    ("Football", r"soccer|f[uú]tbol|futebol|(?<!american )football|laliga|la liga|bundesliga|premier league|serie a\b|\buefa\b|calcio|fu(ss|ß)ball|ligue 1|eredivisie|libertadores|golazo|fifa\+?|bar[cç]a tv|real madrid tv|\bmutv\b|foot\+|el-heddaf|lazio style|brondby|dynamo kyiv|canal do inter|\binter tv\b|\bfck\b|\bgol ?tv\b|\btudn\b",
     r"bein|dazn|champions|premier|\bliga\b|\bfc\b|sky sports?|tribuna|sport ?tv|supersport|arena sport|eleven|espn|fox (deportes|sports)|\btyc\b|win sports|\bmatch\b|setanta|movistar|digi sport|canal\+ sport|rmc sport|l'equipe|max sport|deportes|dsports|claro sports|alkass|(abu dhabi|dubai|bahrain|sharjah|oman|jordan|iraqia|ktv) sports?|arryadia|adjarasport|band sports|\bfutv\b|^sport ?\d|^sport1|ssc|tv3 sport|polsat sport|nova sport|\bsport klub\b|arena\b|\bdeporte"),
]
_SPORT_RE = [(s, re.compile(a, re.I) if a else None, re.compile(b, re.I) if b else None) for s, a, b in _SPORT_RULES]


def classify_sport(name: str, cat_ids: List[str], extra: str = "") -> Optional[str]:
    text = f"{name} {extra}"
    is_sport = any("sport" in (c or "").lower() for c in cat_ids)
    for sport, strong, weak in _SPORT_RE:
        if strong and strong.search(text):
            return sport
        if is_sport and weak and weak.search(text):
            return sport
    return "Other" if is_sport else None


PRIMARY = ["News", "Sports", "Movies", "Series/Entertainment", "Kids", "Music", "Documentary",
           "Lifestyle/Cooking", "Religious", "Education", "Business", "Weather", "Shopping", "General", "Other"]

# Priority order matters: a channel tagged [general, news] is News.
_CAT_MAP: List[Tuple[str, Tuple[str, ...]]] = [
    ("Kids", ("kids", "animation", "family", "cartoon", "children")),
    ("News", ("news", "weather news")),
    ("Sports", ("sport",)),
    ("Movies", ("movie", "cinema", "film")),
    ("Music", ("music",)),
    ("Documentary", ("documentary", "science", "history", "nature")),
    ("Series/Entertainment", ("series", "entertainment", "comedy", "classic", "drama", "show")),
    ("Lifestyle/Cooking", ("lifestyle", "cooking", "food", "relax", "travel", "outdoor", "auto", "fashion")),
    ("Religious", ("religious", "religion", "faith")),
    ("Education", ("education", "culture", "learning")),
    ("Business", ("business", "finance")),
    ("Weather", ("weather",)),
    ("Shopping", ("shop",)),
    ("General", ("general", "legislative", "public", "interactive", "local", "community")),
]
_NAME_RULES = [
    ("News", r"news|\b24\b|\binfo\b|noticias|nachrichten|haber|novosti"),
    ("Kids", r"cartoon|\bkids?\b|junior|\bbaby\b|toon|nick ?jr|disney ?(jr|junior|channel)"),
    ("Music", r"music|\bmtv\b|hits|\bfm\b|radio|m[uú]sica"),
    ("Sports", r"sport"),
    ("Movies", r"movie|cinema|\bfilms?\b|\bkino\b|\bcine\b"),
    ("Religious", r"church|gospel|islam|quran|bible|catholic|christian|\bgod\b|dharma"),
    ("Documentary", r"documentar|discovery|nat ?geo|history"),
    ("Weather", r"weather"),
    ("Shopping", r"shop|\bqvc\b|\bhsn\b"),
    ("Business", r"business|bloomberg|cnbc|finance"),
]
_NAME_RE = [(c, re.compile(r, re.I)) for c, r in _NAME_RULES]


def primary_category(name: str, cat_ids: List[str], sport: Optional[str]) -> str:
    cats = " | ".join((c or "").lower() for c in cat_ids)
    general = False
    for primary, keys in _CAT_MAP:
        if any(k in cats for k in keys):
            if primary == "General":
                general = True
                continue
            return primary
    for primary, rx in _NAME_RE:
        if rx.search(name or ""):
            return primary
    if sport:
        return "Sports"
    return "General" if general else "Other"


def annotate(doc: dict) -> dict:
    cat_ids = doc.get("category_ids") or []
    sport = classify_sport(doc.get("name", ""), cat_ids, " ".join(doc.get("alt_names") or []))
    doc["sport"] = sport
    doc["primary_category"] = primary_category(doc.get("name", ""), cat_ids, sport)
    return doc


# ----------------------------- Fixtures (TheSportsDB) -----------------------------
TSDB = "https://www.thesportsdb.com/api/v1/json/3/eventsday.php"
FIXTURE_SPORTS = {  # TheSportsDB sport name -> our sport chip
    "Soccer": "Football", "Basketball": "Basketball", "American Football": "American Football",
    "Baseball": "Baseball", "Ice Hockey": "Hockey", "Cricket": "Cricket",
    "Motorsport": "Motorsport", "Fighting": "Combat",
}
_fixture_cache: Dict[Tuple[str, str], Tuple[float, dict]] = {}


async def get_fixtures(sport: str, date: str) -> dict:
    key = (sport, date)
    hit = _fixture_cache.get(key)
    if hit and time.time() - hit[0] < 600:
        return hit[1]
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0), follow_redirects=True) as c:
        r = await c.get(TSDB, params={"d": date, "s": sport})
        r.raise_for_status()
        events = (r.json() or {}).get("events") or []
    out = []
    for e in events:
        out.append({
            "id": e.get("idEvent"),
            "league": e.get("strLeague") or "",
            "league_badge": e.get("strLeagueBadge") or "",
            "home": e.get("strHomeTeam") or "",
            "away": e.get("strAwayTeam") or "",
            "event": e.get("strEvent") or "",
            "home_badge": e.get("strHomeTeamBadge") or "",
            "away_badge": e.get("strAwayTeamBadge") or "",
            "timestamp": e.get("strTimestamp") or "",
            "date": e.get("dateEvent") or date,
            "time": e.get("strTime") or "",
            "status": e.get("strStatus") or "",
            "home_score": e.get("intHomeScore"),
            "away_score": e.get("intAwayScore"),
        })
    out.sort(key=lambda x: x["timestamp"] or x["time"])
    data = {"sport": sport, "chip": FIXTURE_SPORTS.get(sport, "Other"), "date": date, "events": out}
    _fixture_cache[key] = (time.time(), data)
    return data


# ----------------------------- Official replays -----------------------------
README_URLS = [
    "https://raw.githubusercontent.com/superlincoln953/Free-Official-Youtube-Content/main/README.md",
    "https://raw.githubusercontent.com/superlincoln953/Free-Official-Youtube-Content/master/README.md",
]
_LINK = re.compile(r"\[(?:\*\*)?(.+?)(?:\*\*)?\]\((https?://[^)\s]+)\)")


def parse_sport_section(md: str) -> List[dict]:
    m = re.search(r"^###\s+Sports?\s*$(.*?)(?=^###\s)", md, re.M | re.S)
    if not m:
        return []
    items, seen = [], set()
    for line in m.group(1).splitlines():
        line = line.strip()
        links = _LINK.findall(line)
        if not links:
            continue
        prefix = line.split("[", 1)[0].strip(" -–")
        desc_m = re.search(r"\)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$", line)
        desc = desc_m.group(1).strip() if desc_m else ""
        for text, url in links:
            text = text.strip("* ")
            name = f"{prefix} ({text})" if prefix else text
            if url in seen:
                continue
            seen.add(url)
            items.append({
                "_id": url, "name": name, "url": url, "description": desc,
                "sport": classify_sport(name, ["sports"], desc) or "Other",
                "kind": "youtube" if ("youtube.com" in url or "youtu.be" in url) else "web",
            })
    return items


async def rescan_replays(db) -> dict:
    md = None
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=True) as c:
        for u in README_URLS:
            try:
                r = await c.get(u)
                if r.status_code == 200 and r.text:
                    md = r.text
                    break
            except Exception:
                continue
    if not md:
        return {"ok": False, "error": "README could not be downloaded; kept previous data"}
    items = parse_sport_section(md)
    if not items:
        return {"ok": False, "error": "Sport section not found; kept previous data"}
    now = datetime.now(timezone.utc).isoformat()
    for it in items:
        it["updated_at"] = now
    await db.replays.delete_many({})
    await db.replays.insert_many(items)
    await db.livetv_meta.update_one({"_id": "replays"}, {"$set": {"ts": now, "count": len(items)}}, upsert=True)
    return {"ok": True, "count": len(items), "updated_at": now}
