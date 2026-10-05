# LUDIA 홍채 분석 서비스 — Hugging Face Spaces (Docker, CPU 무료 등급)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Spaces는 uid 1000 사용자로 실행한다
RUN useradd -m -u 1000 user
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# 모델은 비공개 모델 저장소에서 빌드할 때 받아온다 (Space 설정의 HF_TOKEN / MODEL_REPO 시크릿 사용)
RUN --mount=type=secret,id=HF_TOKEN,mode=0444,required=true \
    --mount=type=secret,id=MODEL_REPO,mode=0444,required=true \
    python -c "from huggingface_hub import snapshot_download; \
snapshot_download(open('/run/secrets/MODEL_REPO').read().strip(), token=open('/run/secrets/HF_TOKEN').read().strip(), local_dir='/app/_models')" \
    && mkdir -p /app/models /app/iris_processing/models \
    && mv /app/_models/ludia_lab /app/models/ludia_lab \
    && mv /app/_models/mobile_sam.pt /app/iris_processing/models/mobile_sam.pt \
    && rm -rf /app/_models

COPY iris_service.py .
COPY iris_processing/ iris_processing/
RUN chown -R user:user /app

USER user
ENV HOME=/home/user MPLCONFIGDIR=/tmp
EXPOSE 7860
CMD ["uvicorn", "iris_service:app", "--host", "0.0.0.0", "--port", "7860"]
