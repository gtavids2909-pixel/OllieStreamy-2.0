from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import hmac
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from livetv_service import LiveTVService
from livetv_proxy import router as livetv_proxy_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ===========================================================================
# Live-TV catalog (iptv-org backed)
# ===========================================================================

livetv = LiveTVService()
api_router.include_router(livetv_proxy_router)


async def _background_probe():
    try:
        stats = await livetv.probe_all(db)
        logger.info("livetv probe done: %s", stats)
    except Exception:
        logger.exception("livetv probe failed")


@api_router.get("/livetv/sync")
async def livetv_sync(bg: BackgroundTasks):
    """Force-refresh (or ensure fresh) the live-TV catalog from iptv-org."""
    try:
        result = await livetv.ensure_fresh(db)
        # Kick off a non-blocking health probe so dead mirrors fall off.
        bg.add_task(_background_probe)
        return result
    except Exception as e:
        logger.exception("livetv_sync failed")
        raise HTTPException(status_code=502, detail=str(e))


@api_router.get("/livetv/probe-status")
async def livetv_probe_status():
    """Quick summary of how many streams have been probed and are alive."""
    pipeline = [
        {"$project": {"streams": 1}},
        {"$unwind": "$streams"},
        {
            "$group": {
                "_id": "$streams.alive",
                "count": {"$sum": 1},
            }
        },
    ]
    counts = {"alive": 0, "dead": 0, "unchecked": 0}
    async for row in db.livetv_channels.aggregate(pipeline):
        key = row["_id"]
        if key is True:
            counts["alive"] = row["count"]
        elif key is False:
            counts["dead"] = row["count"]
        else:
            counts["unchecked"] = row["count"]
    return counts


@api_router.get("/livetv/countries")
async def livetv_countries(include_offline: bool = False):
    await livetv.ensure_fresh(db)
    return {"items": await livetv.list_countries(db, include_offline=include_offline)}


@api_router.get("/livetv/categories")
async def livetv_categories(include_offline: bool = False):
    await livetv.ensure_fresh(db)
    return {"items": await livetv.list_categories(db, include_offline=include_offline)}


@api_router.get("/livetv/channels")
async def livetv_channels(
    country: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(60, ge=1, le=200),
    include_offline: bool = False,
):
    await livetv.ensure_fresh(db)
    return await livetv.list_channels(
        db, country=country, category=category, q=q, page=page, page_size=page_size,
        include_offline=include_offline,
    )


@api_router.get("/livetv/channel/{channel_id}")
async def livetv_channel(channel_id: str, fresh: bool = True):
    await livetv.ensure_fresh(db)
    if fresh:
        # Re-probe this channel's mirrors right now so a scheduled channel that has
        # just gone live is offered first, and a just-died mirror is skipped.
        try:
            await asyncio.wait_for(livetv.recheck_channel(db, channel_id), timeout=12)
        except Exception:
            logger.warning("livetv: fresh recheck timed out for %s", channel_id)
    ch = await livetv.get_channel(db, channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    return ch


# -------- Cron webhook: daily iptv-org refresh ------------------------------
async def _background_livetv_sync():
    try:
        # Force a full re-sync by clearing the stale marker so ensure_fresh re-runs.
        await db.livetv_meta.delete_one({"_id": "last_sync"})
        await livetv.ensure_fresh(db)
        # Then re-probe every stream so dead mirrors are dropped.
        await livetv.probe_all(db)
    except Exception:
        logger.exception("background livetv sync failed")


@api_router.post("/cron/livetv-refresh")
async def cron_livetv_refresh(request: Request, bg: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("authorization", "")
    if not secret or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="unauthorized")
    if not hmac.compare_digest(auth[len("Bearer "):], secret):
        raise HTTPException(status_code=401, detail="unauthorized")
    bg.add_task(_background_livetv_sync)
    return {"status": "accepted"}

# -------- Background loop: keep on/off-air channels fresh ---------------------
async def _priority_loop():
    await asyncio.sleep(60)  # let the app finish booting
    while True:
        try:
            if await db.livetv_channels.estimated_document_count():
                stats = await livetv.probe_priority(db)
                logger.info("livetv priority probe: %s", stats)
        except Exception:
            logger.exception("livetv priority probe failed")
        await asyncio.sleep(15 * 60)


@app.on_event("startup")
async def _start_livetv_loop():
    app.state.livetv_task = asyncio.create_task(_priority_loop())


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()