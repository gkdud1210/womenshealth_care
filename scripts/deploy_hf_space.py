"""
홍채 분석 서비스를 Hugging Face Spaces(무료 CPU)에 배포한다.

  1) 비공개 모델 저장소 <user>/ludia-iris-models 에 모델 업로드 (models/ludia_lab, mobile_sam.pt)
  2) Docker Space <user>/ludia-iris-service 생성, 빌드용 시크릿(HF_TOKEN, MODEL_REPO) 등록
  3) 서비스 코드 + deploy/hf-space/ 설정 업로드 → Spaces가 자동 빌드

사전 준비: iris_processing/.venv/bin/hf auth login  (write 권한 토큰)
실행:     iris_processing/.venv/bin/python scripts/deploy_hf_space.py
"""
import os
import shutil
import tempfile

from huggingface_hub import HfApi, get_token

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
api = HfApi()
user = api.whoami()["name"]
model_repo = f"{user}/ludia-iris-models"
space_repo = f"{user}/ludia-iris-service"

# 1) 모델 — 동의받은 환자 데이터로 학습된 모델이라 반드시 비공개 저장소에 둔다
api.create_repo(model_repo, repo_type="model", private=True, exist_ok=True)
api.upload_folder(repo_id=model_repo, folder_path=os.path.join(ROOT, "models", "ludia_lab"),
                  path_in_repo="ludia_lab", commit_message="LUDIA LAB lesion model")
api.upload_file(repo_id=model_repo, path_or_fileobj=os.path.join(ROOT, "iris_processing", "models", "mobile_sam.pt"),
                path_in_repo="mobile_sam.pt", commit_message="MobileSAM checkpoint")

# 2) Space + 빌드 시크릿
api.create_repo(space_repo, repo_type="space", space_sdk="docker", exist_ok=True)
api.add_space_secret(space_repo, "HF_TOKEN", get_token())
api.add_space_secret(space_repo, "MODEL_REPO", model_repo)

# 3) 코드 업로드 (파이썬 소스만 — 샘플 사진·출력·가상환경 제외)
with tempfile.TemporaryDirectory() as tmp:
    shutil.copytree(os.path.join(ROOT, "deploy", "hf-space"), tmp, dirs_exist_ok=True)
    shutil.copy(os.path.join(ROOT, "iris_service.py"), tmp)
    os.makedirs(os.path.join(tmp, "iris_processing"))
    for f in os.listdir(os.path.join(ROOT, "iris_processing")):
        if f.endswith(".py"):
            shutil.copy(os.path.join(ROOT, "iris_processing", f), os.path.join(tmp, "iris_processing"))
    api.upload_folder(repo_id=space_repo, repo_type="space", folder_path=tmp, commit_message="Deploy iris service")

host = space_repo.replace("/", "-").replace("_", "-").lower()
print(f"\nSpace: https://huggingface.co/spaces/{space_repo}")
print(f"API URL (IRIS_SERVICE_URL): https://{host}.hf.space")
