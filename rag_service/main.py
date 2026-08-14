import logging
import os

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from typing import Dict, Any, List

from services.rag_service import MedicalRAGService

logger = logging.getLogger(__name__)

app = FastAPI(title="Medical RAG API")

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# allow_origins=["*"] combined with allow_credentials=True is forbidden by
# the CORS spec — browsers reject the response. Restrict origins to the
# backend service URL and drop credentials entirely (this is an internal API
# authenticated via the X-Internal-Token header, not via cookies).
_allowed_origins = [
    o.strip()
    for o in os.getenv("RAG_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "X-Internal-Token"],
)

# ---------------------------------------------------------------------------
# Internal-service authentication
# ---------------------------------------------------------------------------
# All endpoints require the caller to supply a shared secret in the
# X-Internal-Token header.  Set RAG_INTERNAL_SECRET in the environment of
# both this service and the backend Node process.
_RAG_INTERNAL_SECRET = os.environ.get("RAG_INTERNAL_SECRET", "")
_api_key_header = APIKeyHeader(name="X-Internal-Token", auto_error=True)


def verify_internal_token(token: str = Security(_api_key_header)) -> None:
    """Dependency that aborts with 403 when the shared secret is missing or wrong."""
    if not _RAG_INTERNAL_SECRET:
        # Fail closed: if the secret is not configured the service must not
        # accept any requests rather than silently allowing all of them.
        raise HTTPException(status_code=503, detail="Service not configured")
    if token != _RAG_INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


# ---------------------------------------------------------------------------
# RAG service initialisation
# ---------------------------------------------------------------------------
try:
    rag_service = MedicalRAGService()
except Exception as e:
    logger.error("Error initializing MedicalRAGService: %s", e)
    rag_service = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Request models — all fields are bounded to prevent resource exhaustion
# ---------------------------------------------------------------------------
class CaseIngestRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=10_000)
    metadata: Dict[str, Any] = {}


class CaseDeleteRequest(BaseModel):
    case_id: str = Field(min_length=1, max_length=100)


class CaseSuggestRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)
    # ge/le prevent a single request from saturating memory with k=100000
    k: int = Field(default=3, ge=1, le=50)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/ingest-case", dependencies=[Depends(verify_internal_token)])
async def ingest_case(request: CaseIngestRequest):
    if rag_service is None:
        raise HTTPException(status_code=503, detail="RAG service unavailable")
    try:
        await run_in_threadpool(
            rag_service.ingest_case,
            case_id=request.case_id,
            text=request.text,
            metadata=request.metadata,
        )
        return {"status": "success", "message": f"Case {request.case_id} ingested successfully."}
    except Exception as e:
        # Log the real error server-side; never expose internals to callers.
        logger.error("ingest_case error for case %s: %s", request.case_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/delete-case", dependencies=[Depends(verify_internal_token)])
async def delete_case(request: CaseDeleteRequest):
    if rag_service is None:
        raise HTTPException(status_code=503, detail="RAG service unavailable")
    try:
        rag_service.delete_case(case_id=request.case_id)
        return {"status": "success", "message": f"Case {request.case_id} vectors deleted successfully."}
    except Exception as e:
        logger.error("delete_case error for case %s: %s", request.case_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/suggest-cases", dependencies=[Depends(verify_internal_token)])
async def suggest_cases(request: CaseSuggestRequest):
    if rag_service is None:
        raise HTTPException(status_code=503, detail="RAG service unavailable")
    try:
        similar_cases = await run_in_threadpool(
            rag_service.get_similar_cases,
            query_text=request.text,
            k=request.k,
        )
        return {"status": "success", "results": similar_cases}
    except Exception as e:
        logger.error("suggest_cases error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
