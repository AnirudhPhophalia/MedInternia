from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List

from services.rag_service import MedicalRAGService

app = FastAPI(title="Medical RAG API")

# Setup CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the RAG service
try:
    rag_service = MedicalRAGService()
except Exception as e:
    print(f"Error initializing MedicalRAGService: {e}")
    # We continue so the app starts, but endpoints will fail if service is None

class CaseIngestRequest(BaseModel):
    case_id: str
    text: str
    metadata: Dict[str, Any] = {}

class CaseSuggestRequest(BaseModel):
    text: str
    k: int = 3

@app.post("/api/ingest-case")
async def ingest_case(request: CaseIngestRequest):
    try:
        rag_service.ingest_case(
            case_id=request.case_id,
            text=request.text,
            metadata=request.metadata
        )
        return {"status": "success", "message": f"Case {request.case_id} ingested successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/suggest-cases")
async def suggest_cases(request: CaseSuggestRequest):
    try:
        similar_cases = rag_service.get_similar_cases(
            query_text=request.text,
            k=request.k
        )
        return {"status": "success", "results": similar_cases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
