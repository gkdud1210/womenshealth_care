#!/bin/bash
# Go Live → Next.js dev server 자동 시작 후 브라우저 열기

cd "$(dirname "$0")/.." || exit 1

# 이미 실행 중이면 바로 열기
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|307\|308"; then
  open http://localhost:3000
  exit 0
fi

# 실행 중이 아니면 서버 시작
npm run dev &

# 준비될 때까지 대기
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|307\|308"; do
  sleep 0.5
done

open http://localhost:3000
