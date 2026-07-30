# -------------------------------------------------------------------
# MedInternia — Biomedical NER Microservice
# Multi-stage Docker build
#   Stage 1 (builder) : download & cache model weights
#   Stage 2 (runtime) : slim image with pre-cached weights
#
# Build:
#   docker build -t medinternia-ner:latest .
#
# Run (CPU):
#   docker run -p 8001:8001 medinternia-ner:latest
#
# Run (GPU — requires nvidia-docker):
#   docker run --gpus all -p 8001:8001 medinternia-ner:latest
# -------------------------------------------------------------------

# ---- Stage 1: download weights ----
FROM python:3.11-slim AS builder

WORKDIR /build

# Install dependencies needed to pull weights
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cache model weights during build so the runtime image is self-contained
# (no outbound internet required at container start time)
COPY scripts/download_models.py scripts/download_models.py
RUN python scripts/download_models.py

# ---- Stage 2: runtime ----
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TRANSFORMERS_CACHE=/root/.cache/huggingface \
    # Override via -e flags at runtime if needed
    DISEASE_MODEL=pruas/BENT-PubMedBERT-NER-Disease \
    GENERAL_BIO_MODEL=d4data/biomedical-ner-all \
    CORS_ORIGINS=http://localhost:3000 \
    MAX_CHARS=4000 \
    PORT=8001

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy pre-downloaded weights from builder
COPY --from=builder /root/.cache/huggingface /root/.cache/huggingface

# Copy application source
COPY app/ app/

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]