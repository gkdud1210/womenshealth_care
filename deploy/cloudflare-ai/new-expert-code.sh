#!/bin/bash
# 루디아피드 전문가 인증 코드 발급 — 전문가 한 명에게 하나씩 전달해요 (한 번 쓰면 끝)
# 사용: ./new-expert-code.sh "가정의학과 전문의"        (로컬 테스트용: --local 을 뒤에 붙이기)
set -euo pipefail
TITLE="${1:?전문가 직함을 넣어주세요. 예: ./new-expert-code.sh \"임상영양사\"}"
WHERE="${2:---remote}"
CODE="LUDIA-$(set +o pipefail; LC_ALL=C tr -dc 'A-HJ-NP-Z2-9' </dev/urandom | head -c 8)"
SAFE_TITLE="${TITLE//\'/\'\'}"
cd "$(dirname "$0")"
npx wrangler d1 execute ludia-feed "$WHERE" --command \
  "INSERT INTO expert_codes (code, title, created_at) VALUES ('$CODE', '$SAFE_TITLE', datetime('now'))" >/dev/null
echo "전문가 인증 코드: $CODE  ($TITLE)"
echo "앱 설정 → 전문가 인증에 이 코드를 넣으면 돼요."
