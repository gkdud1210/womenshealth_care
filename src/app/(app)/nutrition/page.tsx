'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Camera, Send, X, Plus, Check, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { HealthMode } from '@/data/nutritionData'

// ── Types ──────────────────────────────────────────────────────────────────

interface SnsComment {
  id: string
  authorName: string
  authorEmoji: string
  text: string
  createdAt: string
}

interface SnsPost {
  id: string
  authorId: string
  authorName: string
  authorEmoji: string
  authorVerified?: boolean
  createdAt: string
  type: 'recipe' | 'tip'
  title: string
  content: string
  image?: string   // 하위 호환용 (단일 이미지 기존 게시글)
  images?: string[] // 다중 이미지
  coverEmoji?: string
  coverGradient?: string
  tags: HealthMode[]
  likes: number
  saved?: boolean
  comments: SnsComment[]
}

// ── Storage ────────────────────────────────────────────────────────────────

const POSTS_KEY  = 'ludia_sns_v4'
const LIKES_KEY  = 'ludia_sns_likes_v4'
const SAVES_KEY  = 'ludia_sns_saves_v4'

const SEED: SnsPost[] = [
  {
    id: 'official-1', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    type: 'recipe', title: '연어 아보카도 덮밥',
    content: '임신 중 DHA 보충에 딱 맞는 한 그릇 레시피예요 🐟\n\n재료 (1인분)\n• 훈제연어 80g\n• 아보카도 1/2개\n• 시금치 한 줌\n• 현미밥 150g\n• 레몬즙 1작은술, 간장 1작은술\n\n만드는 법\n① 시금치를 30초 데쳐 참기름·소금으로 무쳐요\n② 아보카도를 얇게 슬라이스\n③ 밥 위에 재료를 색깔별로 올리고\n④ 레몬즙+간장 소스를 뿌리면 완성!\n\n🔥 520kcal · DHA 1,800mg',
    coverEmoji: '🍱', coverGradient: 'linear-gradient(135deg,#d1fae5,#6ee7b7)',
    tags: ['임신'], likes: 147,
    comments: [
      { id: 'c1', authorName: '예비맘 🌸', authorEmoji: '🌸', text: '입덧 중에도 먹을 수 있어서 너무 좋아요!', createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: 'c2', authorName: '민지맘', authorEmoji: '🍀', text: '현미밥 대신 잡곡밥으로 만들었는데 더 맛있었어요 😊', createdAt: new Date(Date.now() - 900000).toISOString() },
    ],
  },
  {
    id: 'seed-1', authorId: 'user-1', authorName: '항암중이에요', authorEmoji: '💜',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    type: 'tip', title: '치료 후 입맛 없을 때 먹기 좋은 것들',
    content: '항암 치료 후 며칠간 아무것도 못 먹다가 찾은 조합들 공유해요 🙏\n\n• 차가운 수박 주스 (속 시원하고 수분 보충)\n• 미지근한 녹차 두유 (비린내 없이 단백질)\n• 냉동 바나나 스무디 (달콤하고 칼로리 있음)\n• 구운 고구마 (짜지 않고 소화 편함)\n\n맛을 느끼기 어려울 때는 신맛(레몬, 식초) 살짝 추가하면 입맛이 살아나요. 모두 힘내세요 💪',
    coverEmoji: '🫐', coverGradient: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
    tags: ['항암'], likes: 203,
    comments: [
      { id: 'c3', authorName: '함께해요', authorEmoji: '🌻', text: '수박 주스 진짜 효과 있었어요! 감사합니다', createdAt: new Date(Date.now() - 3000000).toISOString() },
    ],
  },
  {
    id: 'official-2', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    type: 'recipe', title: '닭가슴살 채소 볶음',
    content: '다이어트 중에도 맛있게 먹을 수 있는 고단백 한 끼 🥘\n\n재료 (1인분)\n• 닭가슴살 150g\n• 브로콜리 100g\n• 파프리카 1/2개\n• 양파 1/4개\n• 간장 2작은술, 올리브오일 1작은술\n• 마늘 2쪽, 후추\n\n만드는 법\n① 닭가슴살을 간장·마늘·후추로 10분 재우기\n② 채소를 한 입 크기로 자르기\n③ 강불에 닭가슴살 먼저 볶다가\n④ 채소 넣고 3-4분 더 볶으면 완성!\n\n💡 Tip: 재워두면 훨씬 부드러워요\n🔥 310kcal · 단백질 31g',
    coverEmoji: '🥘', coverGradient: 'linear-gradient(135deg,#dbeafe,#93c5fd)',
    tags: ['다이어트'], likes: 312,
    comments: [
      { id: 'c4', authorName: '헬스중', authorEmoji: '💪', text: '매주 만들어 먹고 있어요! 진짜 다이어트 필수 레시피', createdAt: new Date(Date.now() - 5400000).toISOString() },
      { id: 'c5', authorName: '건강덕후', authorEmoji: '🌿', text: '두부 추가해서 만들면 포만감이 더 좋아요', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  },
  {
    id: 'seed-2', authorId: 'user-2', authorName: '50대언니', authorEmoji: '🌺',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    type: 'recipe', title: '안면홍조에 효과 봤던 두유 스무디',
    content: '갱년기 3년차, 이 레시피로 진짜 효과 봤어요 🌸\n\n두유 200ml + 냉동 아마씨 1큰술 + 바나나 반 개 + 계피가루 약간 + 얼음 한 줌\n\n블렌더에 30초만 갈면 끝!\n\n이소플라본 + 리그난 조합으로 3주 꾸준히 마셨더니 안면홍조 횟수가 눈에 띄게 줄었어요. 의사 선생님도 계속 드셔도 된다고 하셨어요 😊\n\n아마씨는 냉동 보관하면 오래가요!',
    coverEmoji: '🥤', coverGradient: 'linear-gradient(135deg,#fef3c7,#fde68a)',
    tags: ['갱년기'], likes: 178,
    comments: [
      { id: 'c6', authorName: '갱년기공부중', authorEmoji: '📚', text: '오늘부터 시작해볼게요! 아마씨는 어디서 사세요?', createdAt: new Date(Date.now() - 7200000).toISOString() },
    ],
  },
  {
    id: 'official-3', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    type: 'recipe', title: '강황 두부 수프',
    content: '항산화+단백질 두 마리 토끼를 잡는 항암 수프 🍵\n\n재료 (2인분)\n• 두부 200g\n• 당근 1/2개, 양파 1/2개\n• 강황가루 1작은술\n• 생강 1쪽\n• 채소 육수 400ml\n• 코코넛밀크 100ml\n• 올리브오일\n\n만드는 법\n① 양파·당근을 볶다가 강황+생강 넣어 향 내기\n② 육수 붓고 12분 끓이기\n③ 두부·코코넛밀크 넣고 5분 더\n\n💡 흑후추 한 꼬집 추가하면 커큐민 흡수율 20배↑\n🔥 185kcal (1인분)',
    coverEmoji: '🍲', coverGradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
    tags: ['항암'], likes: 94,
    comments: [],
  },
  {
    id: 'seed-3', authorId: 'user-3', authorName: '건강덕후', authorEmoji: '💪',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    type: 'tip', title: '고단백 아침 식사 루틴 공유',
    content: '다이어트 6개월째, 아침 루틴 공유해요!\n\n그릭요거트 100g + 블루베리 50g + 아몬드 10g + 꿀 1작은술\n\n이게 다예요 😂 10분도 안 걸리는데 단백질 10g + 항산화 챙기기 완료!\n\n포인트는 그릭요거트를 플레인으로 사는 것 (가당 피하기). 달콤함은 꿀로 조절하면 훨씬 건강해요.\n\n1kg 빠지는 데 이게 제일 도움 됐어요. 저처럼 아침에 귀찮으신 분들께 강추 🙌',
    coverEmoji: '🫙', coverGradient: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)',
    tags: ['다이어트', '일반'], likes: 267,
    comments: [
      { id: 'c7', authorName: '다이어터', authorEmoji: '🏃', text: '저도 따라해볼게요! 그릭요거트 브랜드 추천해주실 수 있어요?', createdAt: new Date(Date.now() - 28800000).toISOString() },
    ],
  },
  {
    id: 'official-4', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    type: 'tip', title: '여성을 위한 홈트 루틴 — 30분',
    content: '기구 없이 집에서 할 수 있는 전신 운동 루틴이에요 🏠\n\n🔥 워밍업 5분\n• 제자리 걷기 → 팔 돌리기 → 고관절 원 그리기\n\n💪 본운동 20분 (2세트)\n① 스쿼트 15회 — 허벅지·엉덩이 강화\n② 런지 10회 (양쪽) — 하체 균형 잡기\n③ 힙 브릿지 20회 — 골반저근·코어\n④ 플랭크 30초 — 복부·허리\n⑤ 버피 10회 — 전신 유산소\n\n🧘 쿨다운 5분\n• 햄스트링·고관절 스트레칭\n\n💡 생리 중에는 강도를 낮추고 요가 위주로 바꿔요\n주 3회 꾸준히 하면 4주 후 달라진 몸을 느낄 수 있어요!',
    coverEmoji: '🏃‍♀️', coverGradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
    tags: ['다이어트', '일반'], likes: 421,
    comments: [
      { id: 'c8', authorName: '운동초보', authorEmoji: '🌱', text: '버피가 너무 힘든데 대체 동작이 있을까요?', createdAt: new Date(Date.now() - 43200000).toISOString() },
      { id: 'c9', authorName: '루디아', authorEmoji: '💜', text: '마운틴 클라이머나 점프 없는 스텝업으로 대체 가능해요 😊', createdAt: new Date(Date.now() - 40000000).toISOString() },
    ],
  },
  {
    id: 'seed-4', authorId: 'user-4', authorName: '요가하는언니', authorEmoji: '🧘',
    createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
    type: 'tip', title: '생리통에 진짜 효과 있는 요가 5가지',
    content: '생리 첫날 정말 못 움직일 때 이 5가지로 버텨요 🩸\n\n① 아이 자세 (Child\'s Pose)\n엎드려 이마를 바닥에 대고 팔을 앞으로 뻗기. 2분 유지. 자궁 압박 완화.\n\n② 누운 나비 자세\n발바닥을 맞대고 무릎을 옆으로 펼치기. 복식호흡 3분. 골반 이완.\n\n③ 고양이-소 자세\n네 발 자세에서 등을 위아래로 천천히. 1분. 허리 통증 완화.\n\n④ 옆으로 누운 태아 자세\n왼쪽 옆으로 누워 무릎 당기기. 핫팩과 함께하면 최고.\n\n⑤ 다리 벽에 올리기\n등을 바닥에 대고 다리를 벽에 기대기. 5분. 혈액순환+부종 완화.\n\n생리통 심할수록 움직이기 싫지만 이것만큼은 진짜 도움 돼요 💜',
    coverEmoji: '🧘‍♀️', coverGradient: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
    tags: ['일반'], likes: 534,
    comments: [
      { id: 'c10', authorName: '생리통괴로워', authorEmoji: '😖', text: '오늘 당장 해봤는데 진짜 좀 나아진 것 같아요 감사해요!!', createdAt: new Date(Date.now() - 50000000).toISOString() },
      { id: 'c11', authorName: '요가입문', authorEmoji: '🌸', text: '저장해뒀다가 매달 꺼내 볼게요 🙏', createdAt: new Date(Date.now() - 48000000).toISOString() },
    ],
  },
  {
    id: 'official-5', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    type: 'tip', title: '간헐적 단식 16:8 시작 가이드',
    content: '가장 쉽게 시작할 수 있는 다이어트 방법이에요 ⏰\n\n📌 16:8 이란?\n하루 16시간 공복 + 8시간 식사 창\n예) 오전 12시~오후 8시만 식사\n\n✅ 시작 전 알아야 할 것\n• 처음엔 14:10으로 시작해서 서서히 늘리기\n• 공복 중엔 물, 블랙커피, 녹차 OK\n• 식사 창에서도 폭식 금지 (칼로리 관리 필수)\n\n🍽️ 첫 끼 추천 — 닭가슴살 + 샐러드 + 현미밥\n마지막 끼 추천 — 단백질 위주 (두부·계란)\n\n⚠️ 주의: 생리 중에는 혈당 변동이 크므로 일시 중단 권장\n임신·수유 중이거나 저혈당 이력 있으면 전문가 상담 먼저!\n\n3주면 결과 보여요. 꾸준히 함께해요 💪',
    coverEmoji: '⏰', coverGradient: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
    tags: ['다이어트'], likes: 389,
    comments: [
      { id: 'c12', authorName: '간헐적단식중', authorEmoji: '⏱️', text: '2개월째 하고 있는데 -4kg 성공했어요!', createdAt: new Date(Date.now() - 65000000).toISOString() },
      { id: 'c13', authorName: '다이어트도전', authorEmoji: '🔥', text: '생리 중 쉬어도 된다는 거 몰랐어요. 꼭 기억할게요', createdAt: new Date(Date.now() - 60000000).toISOString() },
    ],
  },
  {
    id: 'seed-5', authorId: 'user-5', authorName: 'PT받는중', authorEmoji: '🏋️',
    createdAt: new Date(Date.now() - 3600000 * 84).toISOString(),
    type: 'tip', title: '헬스 초보 여성을 위한 웨이트 입문 팁',
    content: '헬스장 처음 등록하고 뭘 해야 할지 몰라서 헤맸던 분들께 🏋️‍♀️\n\n❌ 흔한 실수\n• 유산소만 1시간씩 하기 → 근손실 + 정체기\n• 남성 루틴 따라하기 → 여성 호르몬 주기와 안 맞음\n• 무거운 거 들면 몸이 커진다는 오해 → 절대 아니에요!\n\n✅ 초보 여성 추천 루틴\n월·목: 하체 (스쿼트, 레그프레스, 힙어브덕션)\n화·금: 상체 (랫풀다운, 시티드로우, 덤벨숄더프레스)\n수: 유산소 30분 or 휴식\n토: 전신 가볍게\n\n💡 여성 호르몬 사이클 맞춤 운동\n• 난포기(생리 후~배란): 고강도 가능\n• 황체기(배란~생리 전): 유연성·가벼운 운동 추천\n\n3개월만 꾸준히 하면 완전히 달라져요! 질문 환영 😊',
    coverEmoji: '🏋️', coverGradient: 'linear-gradient(135deg,#fef9c3,#fef08a)',
    tags: ['다이어트', '일반'], likes: 298,
    comments: [
      { id: 'c14', authorName: '헬스입문자', authorEmoji: '🌱', text: '유산소만 했는데 이제 웨이트 시작해볼게요!', createdAt: new Date(Date.now() - 80000000).toISOString() },
    ],
  },
  {
    id: 'seed-6', authorId: 'user-6', authorName: '필라테스강사', authorEmoji: '🤸‍♀️',
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    type: 'tip', title: '임산부도 할 수 있는 안전한 운동 3가지',
    content: '임신 중 운동, 해도 될까요? → 오히려 꼭 해야 해요! 🤰\n\n단, 안전한 운동만 선택하는 게 중요해요.\n\n✅ 임신 중 추천 운동\n\n① 걷기\n• 언제부터: 임신 전 기간 가능\n• 강도: 대화 가능한 속도 (숨 차지 않게)\n• 시간: 30분, 주 5회\n• 효과: 부종 완화, 혈당 조절, 기분 개선\n\n② 수중 걷기·수영\n• 관절 부담 없이 전신 운동 가능\n• 부종·요통에 특히 효과적\n• 수영장 수온 38°C 이하 확인\n\n③ 임산부 요가·필라테스\n• 골반저근 강화 → 출산 준비\n• 호흡법 훈련 → 분만 도움\n• 전문 임산부 클래스 선택 권장\n\n❌ 피해야 할 운동\n• 누운 자세 복근 운동 (20주 이후)\n• 점프·충격이 강한 운동\n• 숨이 심하게 차는 고강도 운동\n\n가벼운 운동이 태아에게도 좋은 영향을 줘요 🌿',
    coverEmoji: '🤸‍♀️', coverGradient: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
    tags: ['임신'], likes: 445,
    comments: [
      { id: 'c15', authorName: '임신32주', authorEmoji: '🌸', text: '수중 걷기 시작했는데 부종이 정말 줄었어요!', createdAt: new Date(Date.now() - 90000000).toISOString() },
      { id: 'c16', authorName: '예비맘', authorEmoji: '🍀', text: '골반저근 운동이 출산에 도움된다는 게 진짜인가요?', createdAt: new Date(Date.now() - 86000000).toISOString() },
    ],
  },
  {
    id: 'official-6', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 110).toISOString(),
    type: 'tip', title: '항암 치료 중 운동, 이렇게 하세요',
    content: '치료 중 운동이 오히려 도움이 된다는 연구 결과들이 늘고 있어요 💜\n\n✅ 항암 중 운동의 효과\n• 피로감 30% 감소\n• 우울·불안 완화\n• 면역 기능 지원\n• 근육량 유지 → 치료 완료 후 회복 빠름\n\n🚶‍♀️ 추천: 가벼운 걷기\n• 하루 10~20분부터 시작\n• 피곤하면 5분도 OK, 꾸준함이 핵심\n• 야외 햇빛 아래 걷기 = 비타민D + 기분 개선\n\n🧘 추천: 부드러운 요가·스트레칭\n• 관절 가동범위 유지\n• 림프 순환 도움\n• 통증 관리\n\n⚠️ 주의사항\n• 백혈구 수치 낮을 때는 공공 헬스장 피하기\n• 발열·심한 피로 시 즉시 중단\n• 주치의와 운동 계획 상의\n\n무리하지 않는 선에서 몸을 움직이는 것,\n그 자체가 이미 용감한 일이에요 🌟',
    coverEmoji: '🌟', coverGradient: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
    tags: ['항암'], likes: 167,
    comments: [
      { id: 'c17', authorName: '투병중', authorEmoji: '💪', text: '치료 중에도 걷기 운동 꾸준히 하고 있어요. 정말 도움돼요', createdAt: new Date(Date.now() - 100000000).toISOString() },
    ],
  },
  {
    id: 'multi-1', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    type: 'recipe', title: '닭가슴살 볶음밥 — 단계별 사진',
    content: '사진으로 보는 고단백 볶음밥 레시피예요 📸\n\n재료 (1인분)\n• 닭가슴살 120g\n• 현미밥 150g\n• 달걀 1개\n• 파프리카 1/4개, 양파 1/4개\n• 간장 1큰술, 참기름 1작은술\n• 다진 마늘 1작은술\n\n▶ Step 1 재료를 먹기 좋게 손질하고\n▶ Step 2 강불에 달걀→닭가슴살→채소 순서로 볶다가\n▶ 완성! 밥을 넣고 간장으로 간 맞추면 끝\n\n🔥 480kcal · 단백질 35g · 조리시간 15분',
    images: [
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MDAnIGhlaWdodD0nNDAwJz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB5MT0nMCcgeDI9JzEnIHkyPScxJz48c3RvcCBvZmZzZXQ9JzAlJyBzdG9wLWNvbG9yPScjZmVmM2M3Jy8+PHN0b3Agb2Zmc2V0PScxMDAlJyBzdG9wLWNvbG9yPScjZmNkMzRkJy8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSc0MDAnIGZpbGw9J3VybCgjZyknLz48dGV4dCB4PScyMDAnIHk9JzE3MCcgZm9udC1zaXplPScxMTAnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnPvCfpZc8L3RleHQ+PHRleHQgeD0nMjAwJyB5PSczMDAnIGZvbnQtc2l6ZT0nMjYnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGZpbGw9JyM5MjQwMGUnIGZvbnQtZmFtaWx5PSdzeXN0ZW0tdWknIGZvbnQtd2VpZ2h0PSc3MDAnPlN0ZXAgMSDCtyDsnqzro4wg7KSA67mEPC90ZXh0Pjwvc3ZnPg==',
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MDAnIGhlaWdodD0nNDAwJz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB5MT0nMCcgeDI9JzEnIHkyPScxJz48c3RvcCBvZmZzZXQ9JzAlJyBzdG9wLWNvbG9yPScjZDFmYWU1Jy8+PHN0b3Agb2Zmc2V0PScxMDAlJyBzdG9wLWNvbG9yPScjNmVlN2I3Jy8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSc0MDAnIGZpbGw9J3VybCgjZyknLz48dGV4dCB4PScyMDAnIHk9JzE3MCcgZm9udC1zaXplPScxMTAnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnPvCfjbM8L3RleHQ+PHRleHQgeD0nMjAwJyB5PSczMDAnIGZvbnQtc2l6ZT0nMjYnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGZpbGw9JyMwNjVmNDYnIGZvbnQtZmFtaWx5PSdzeXN0ZW0tdWknIGZvbnQtd2VpZ2h0PSc3MDAnPlN0ZXAgMiDCtyDrs7bquLA8L3RleHQ+PC9zdmc+',
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MDAnIGhlaWdodD0nNDAwJz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB5MT0nMCcgeDI9JzEnIHkyPScxJz48c3RvcCBvZmZzZXQ9JzAlJyBzdG9wLWNvbG9yPScjZmNlN2YzJy8+PHN0b3Agb2Zmc2V0PScxMDAlJyBzdG9wLWNvbG9yPScjZjlhOGQ0Jy8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSc0MDAnIGZpbGw9J3VybCgjZyknLz48dGV4dCB4PScyMDAnIHk9JzE3MCcgZm9udC1zaXplPScxMTAnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnPvCfjbE8L3RleHQ+PHRleHQgeD0nMjAwJyB5PSczMDAnIGZvbnQtc2l6ZT0nMjYnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGZpbGw9JyM5ZDE3NGQnIGZvbnQtZmFtaWx5PSdzeXN0ZW0tdWknIGZvbnQtd2VpZ2h0PSc3MDAnPuyZhOyEsSEg66eb7J6I6rKMIOuTnOyEuOyalCDwn46JPC90ZXh0Pjwvc3ZnPg==',
    ],
    tags: ['다이어트', '일반'], likes: 58,
    comments: [
      { id: 'cm1', authorName: '다이어터', authorEmoji: '🏃', text: '사진으로 보니까 훨씬 쉬워 보여요! 도전해볼게요 🙌', createdAt: new Date(Date.now() - 1800000).toISOString() },
    ],
  },
]

function loadPosts(): SnsPost[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(POSTS_KEY)
    if (s) return JSON.parse(s)
    localStorage.setItem(POSTS_KEY, JSON.stringify(SEED))
    return SEED
  } catch { return SEED }
}
function savePosts(p: SnsPost[]) { try { localStorage.setItem(POSTS_KEY, JSON.stringify(p)) } catch {} }
function loadLikes(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { const s = localStorage.getItem(LIKES_KEY); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
}
function saveLikes(s: Set<string>) { try { localStorage.setItem(LIKES_KEY, JSON.stringify(Array.from(s))) } catch {} }
function loadSaves(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { const s = localStorage.getItem(SAVES_KEY); return s ? new Set(JSON.parse(s)) : new Set() } catch { return new Set() }
}
function saveSaves(s: Set<string>) { try { localStorage.setItem(SAVES_KEY, JSON.stringify(Array.from(s))) } catch {} }

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 1080
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const day = Math.floor(h / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const TAG_META: Record<HealthMode, { color: string; bg: string; emoji: string }> = {
  임신:    { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',  emoji: '🤰' },
  다이어트: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)',  emoji: '🥗' },
  항암:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', emoji: '💜' },
  갱년기:  { color: '#d97706', bg: 'rgba(217,119,6,0.1)',  emoji: '🌸' },
  일반:    { color: '#e11d5a', bg: 'rgba(225,29,90,0.1)',  emoji: '✨' },
}
const ALL_MODES = Object.keys(TAG_META) as HealthMode[]

const AUTHOR_EMOJIS = ['🌸','🌿','💪','✨','🦋','🌻','🍀','💜','🌺','🌙','⭐','🔥','🎯','🌈']

// ── Post card ──────────────────────────────────────────────────────────────

function PostCard({
  post, liked, saved, currentUserId, currentUserName, currentUserEmoji,
  onLike, onSave, onDelete, onAddComment,
}: {
  post: SnsPost
  liked: boolean; saved: boolean
  currentUserId: string | undefined
  currentUserName: string; currentUserEmoji: string
  onLike: (id: string) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  onAddComment: (postId: string, text: string) => void
}) {
  const [expanded, setExpanded]       = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showMenu, setShowMenu]       = useState(false)
  const [imgIdx, setImgIdx]           = useState(0)
  const touchX = useRef<number | null>(null)
  const isOwn = currentUserId && post.authorId === currentUserId
  const preview = post.content.slice(0, 100)
  const needsExpand = post.content.length > 100

  // 이미지 배열 통합 (하위 호환)
  const allImages = post.images?.length ? post.images : post.image ? [post.image] : []
  const hasImages = allImages.length > 0

  function submitComment() {
    const t = commentText.trim()
    if (!t) return
    onAddComment(post.id, t)
    setCommentText('')
  }

  return (
    <article className="bg-white rounded-xl shadow-sm mb-2 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
          style={{ background: post.authorVerified ? 'linear-gradient(135deg,#f43f75,#a855f7)' : 'rgba(244,63,117,0.12)' }}>
          {post.authorVerified ? <span className="text-white text-base font-black">L</span> : post.authorEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[15px] font-bold text-slate-900">{post.authorName}</span>
            {post.authorVerified && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: post.type === 'recipe' ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.12)', color: post.type === 'recipe' ? '#a16207' : '#1d4ed8' }}>
              {post.type === 'recipe' ? '🍳 레시피' : '💡 팁'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px]">🌐</span>
            {post.tags.map(t => (
              <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: TAG_META[t].bg, color: TAG_META[t].color }}>
                {TAG_META[t].emoji} {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
            <MoreHorizontal className="w-5 h-5 text-slate-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden min-w-[130px]">
                {isOwn && (
                  <button onClick={() => { onDelete(post.id); setShowMenu(false) }}
                    className="w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 text-left">
                    🗑 삭제하기
                  </button>
                )}
                <button onClick={() => setShowMenu(false)}
                  className="w-full px-4 py-3 text-sm text-slate-500 hover:bg-slate-50 text-left">
                  닫기
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Caption (text first, Facebook style) ── */}
      <div className="px-4 pb-3">
        <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-line">
          {expanded || !needsExpand ? post.content : preview + '...'}
        </p>
        {needsExpand && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-[13px] font-semibold text-slate-500 mt-1">더 보기</button>
        )}
      </div>

      {/* ── Image carousel ── */}
      {(hasImages || post.coverEmoji) && (
        <div className="w-full relative overflow-hidden"
          style={{
            background: hasImages ? '#111' : post.coverGradient ?? 'linear-gradient(135deg,#fce7f3,#ede9fe)',
            aspectRatio: hasImages ? '4/3' : '16/9',
          }}
          onTouchStart={e => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 40) setImgIdx(i => dx < 0 ? Math.min(i + 1, allImages.length - 1) : Math.max(i - 1, 0))
            touchX.current = null
          }}>
          {hasImages ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={allImages[imgIdx]} alt="" className="w-full h-full object-cover" />
              {allImages.length > 1 && imgIdx > 0 && (
                <button onClick={() => setImgIdx(i => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-md"
                  style={{ background: 'rgba(255,255,255,0.88)' }}>
                  <span className="text-slate-700 text-base font-bold">‹</span>
                </button>
              )}
              {allImages.length > 1 && imgIdx < allImages.length - 1 && (
                <button onClick={() => setImgIdx(i => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-md"
                  style={{ background: 'rgba(255,255,255,0.88)' }}>
                  <span className="text-slate-700 text-base font-bold">›</span>
                </button>
              )}
              {allImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allImages.map((_, i) => (
                    <button key={i} onClick={() => setImgIdx(i)}
                      className="rounded-full transition-all"
                      style={{ width: i === imgIdx ? 18 : 7, height: 7, background: i === imgIdx ? '#f43f75' : 'rgba(255,255,255,0.7)' }} />
                  ))}
                </div>
              )}
              {allImages.length > 1 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}>
                  {imgIdx + 1} / {allImages.length}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <span className="text-6xl leading-none">{post.coverEmoji ?? '🍽️'}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Reaction count row ── */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
              style={{ background: liked ? '#ef4444' : '#1877f2' }}>
              {liked ? '❤️' : '👍'}
            </span>
          </div>
          <span className="text-[13px] text-slate-500">{post.likes.toLocaleString()}명</span>
        </div>
        {post.comments.length > 0 && (
          <button onClick={() => setShowComments(v => !v)}
            className="text-[13px] text-slate-500 hover:underline">
            댓글 {post.comments.length}개
          </button>
        )}
      </div>

      {/* ── Action buttons (Facebook style) ── */}
      <div className="flex border-t border-b border-slate-100 mx-4">
        <button onClick={() => onLike(post.id)}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg my-1 mx-0.5 transition-all active:scale-95',
            liked ? 'text-rose-500' : 'text-slate-500 hover:bg-slate-50')}>
          <Heart className={cn('w-4.5 h-4.5', liked && 'fill-rose-500')} style={{ width: 18, height: 18 }} />
          <span className="text-[13px] font-semibold">좋아요</span>
        </button>
        <button onClick={() => setShowComments(v => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg my-1 mx-0.5 text-slate-500 hover:bg-slate-50 transition-all active:scale-95">
          <MessageCircle style={{ width: 18, height: 18 }} />
          <span className="text-[13px] font-semibold">댓글</span>
        </button>
        <button onClick={() => onSave(post.id)}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg my-1 mx-0.5 transition-all active:scale-95',
            saved ? 'text-rose-500' : 'text-slate-500 hover:bg-slate-50')}>
          <Bookmark className={cn('w-4.5 h-4.5', saved && 'fill-rose-500')} style={{ width: 18, height: 18 }} />
          <span className="text-[13px] font-semibold">저장</span>
        </button>
      </div>

      {/* ── Comments ── */}
      {showComments && post.comments.length > 0 && (
        <div className="px-4 pt-2 pb-1 space-y-3">
          {post.comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'rgba(244,63,117,0.1)' }}>
                {c.authorEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-block px-3 py-2 rounded-2xl rounded-tl-sm"
                  style={{ background: '#f0f2f5' }}>
                  <p className="text-[12px] font-bold text-slate-900">{c.authorName}</p>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{c.text}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 px-1">{timeAgo(c.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Comment input ── */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: 'rgba(244,63,117,0.1)' }}>
          {currentUserEmoji}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
          style={{ background: '#f0f2f5' }}>
          <input value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
            placeholder="댓글 달기..."
            className="flex-1 text-[13px] bg-transparent outline-none placeholder-slate-400 text-slate-800" />
          {commentText.trim() && (
            <button onClick={submitComment}>
              <Send className="w-4 h-4 text-rose-400" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Write modal ────────────────────────────────────────────────────────────

function WriteModal({
  authorName, authorEmoji,
  onClose, onSubmit,
}: {
  authorName: string; authorEmoji: string
  onClose: () => void
  onSubmit: (post: Omit<SnsPost, 'id' | 'createdAt' | 'likes' | 'comments'>) => void
}) {
  const [images,    setImages]    = useState<string[]>([])
  const [content,   setContent]   = useState('')
  const [type,      setType]      = useState<'recipe' | 'tip'>('recipe')
  const [tags,      setTags]      = useState<HealthMode[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const MAX_IMAGES = 10

  const coverGradients: Record<HealthMode, string> = {
    임신: 'linear-gradient(135deg,#d1fae5,#6ee7b7)',
    다이어트: 'linear-gradient(135deg,#dbeafe,#93c5fd)',
    항암: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
    갱년기: 'linear-gradient(135deg,#fef3c7,#fde68a)',
    일반: 'linear-gradient(135deg,#ffe4e6,#fecdd3)',
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const remaining = MAX_IMAGES - images.length
      const toProcess = files.slice(0, remaining)
      const compressed = await Promise.all(toProcess.map(compressImage))
      setImages(prev => [...prev, ...compressed])
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  function submit() {
    if (!content.trim()) return
    const firstLine = content.split('\n')[0].slice(0, 50)
    onSubmit({
      authorId: 'me', authorName, authorEmoji,
      type, title: firstLine, content: content.trim(),
      images: images.length > 0 ? images : undefined,
      coverEmoji: type === 'recipe' ? '🍽️' : '💡',
      coverGradient: tags[0] ? coverGradients[tags[0]] : 'linear-gradient(135deg,#fce7f3,#ede9fe)',
      tags,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#fff' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button onClick={onClose} className="p-1">
          <X className="w-6 h-6 text-slate-600" />
        </button>
        <p className="text-base font-bold text-slate-800">새 게시물</p>
        <button onClick={submit} disabled={!content.trim()}
          className="text-sm font-bold text-rose-500 disabled:text-slate-300">
          공유
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Image grid */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-1.5">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/55 rounded-full flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>대표</span>
                )}
              </div>
            ))}
            {/* + 추가 버튼 */}
            {images.length < MAX_IMAGES && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
                style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)', border: '1.5px dashed rgba(244,63,117,0.3)' }}>
                {uploading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-rose-300 border-t-rose-500 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-rose-400" />
                    <span className="text-[10px] font-semibold text-rose-400">
                      {images.length === 0 ? '사진 추가' : `+추가 (${images.length}/${MAX_IMAGES})`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
          {images.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-1.5">
              첫 번째 사진이 대표 이미지로 표시됩니다 · 최대 {MAX_IMAGES}장
            </p>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

        <div className="px-4 py-4 space-y-4">
          {/* User row */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'rgba(244,63,117,0.1)' }}>
              {authorEmoji}
            </div>
            <span className="text-sm font-bold text-slate-800">{authorName}</span>
          </div>

          {/* Content */}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            rows={7} maxLength={2000}
            placeholder="레시피나 건강 팁을 공유해보세요...\n\n재료, 만드는 법, 효과 등을 자세히 적어주시면 더 도움이 돼요 🙏"
            className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed" />
          <p className="text-[11px] text-slate-400 text-right">{content.length} / 2000</p>

          {/* Post type */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">종류</p>
            <div className="flex gap-2">
              {(['recipe', 'tip'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all border"
                  style={type === t
                    ? { background: t === 'recipe' ? '#fefce8' : '#eff6ff', borderColor: t === 'recipe' ? '#ca8a04' : '#2563eb', color: t === 'recipe' ? '#a16207' : '#1d4ed8' }
                    : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                  }>
                  {t === 'recipe' ? '🍳 레시피' : '💡 팁·경험'}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">카테고리 <span className="font-normal text-slate-400">(복수 선택)</span></p>
            <div className="flex flex-wrap gap-2">
              {ALL_MODES.map(m => {
                const on = tags.includes(m)
                const meta = TAG_META[m]
                return (
                  <button key={m} onClick={() => setTags(prev => on ? prev.filter(t => t !== m) : [...prev, m])}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                    style={on
                      ? { background: meta.bg, borderColor: meta.color, color: meta.color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                    }>
                    {meta.emoji} {m}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const { user } = useAuth()
  const [posts,     setPosts]      = useState<SnsPost[]>([])
  const [liked,     setLiked]      = useState<Set<string>>(new Set())
  const [saved,     setSaved]      = useState<Set<string>>(new Set())
  const [filter,    setFilter]     = useState<HealthMode | 'all'>('all')
  const [query,     setQuery]      = useState('')
  const [showWrite, setShowWrite]  = useState(false)

  const authorName  = user?.nickname || user?.name || '나'
  const authorEmoji = AUTHOR_EMOJIS[Math.abs(authorName.charCodeAt(0)) % AUTHOR_EMOJIS.length]

  useEffect(() => {
    setPosts(loadPosts())
    setLiked(loadLikes())
    setSaved(loadSaves())
  }, [])

  const feed = posts
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(p => filter === 'all' || p.tags.includes(filter))
    .filter(p => {
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      // 해시태그 검색: #임신 → tags에서 검색
      if (q.startsWith('#')) {
        const tag = q.slice(1)
        return p.tags.some(t => t.toLowerCase().includes(tag)) ||
               p.type.toLowerCase().includes(tag)
      }
      // 일반 검색: 제목·내용·작성자·태그 전체
      return p.title.toLowerCase().includes(q) ||
             p.content.toLowerCase().includes(q) ||
             p.authorName.toLowerCase().includes(q) ||
             p.tags.some(t => t.toLowerCase().includes(q))
    })

  const handleLike = useCallback((id: string) => {
    setLiked(prev => {
      const next = new Set(prev)
      const was = next.has(id)
      was ? next.delete(id) : next.add(id)
      saveLikes(next)
      setPosts(prevP => {
        const updated = prevP.map(p => p.id === id ? { ...p, likes: p.likes + (was ? -1 : 1) } : p)
        savePosts(updated); return updated
      })
      return next
    })
  }, [])

  const handleSave = useCallback((id: string) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveSaves(next); return next
    })
  }, [])

  const handleDelete = useCallback((id: string) => {
    setPosts(prev => { const u = prev.filter(p => p.id !== id); savePosts(u); return u })
  }, [])

  const handleAddComment = useCallback((postId: string, text: string) => {
    setPosts(prev => {
      const updated = prev.map(p => p.id === postId ? {
        ...p,
        comments: [...p.comments, {
          id: `c-${Date.now()}`,
          authorName, authorEmoji,
          text, createdAt: new Date().toISOString(),
        }],
      } : p)
      savePosts(updated); return updated
    })
  }, [authorName, authorEmoji])

  const handleSubmit = useCallback((draft: Omit<SnsPost, 'id' | 'createdAt' | 'likes' | 'comments'>) => {
    const post: SnsPost = { ...draft, id: `post-${Date.now()}`, createdAt: new Date().toISOString(), likes: 0, comments: [] }
    setPosts(prev => { const u = [post, ...prev]; savePosts(u); return u })
    setShowWrite(false)
  }, [])

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>

      {/* ── Instagram-style header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">루디아피드</h1>
          <button onClick={() => setShowWrite(true)}
            className="p-1.5 rounded-full hover:bg-slate-50 transition-colors">
            <Plus className="w-6 h-6 text-slate-800" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="#해시태그 또는 검색어 입력..."
              className="w-full pl-9 pr-9 py-2 rounded-2xl text-sm bg-slate-100 border-none outline-none placeholder-slate-400 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
          {query.startsWith('#') && (
            <p className="text-[11px] text-rose-400 font-semibold mt-1 pl-1">
              해시태그 검색: {query}
            </p>
          )}
        </div>

        {/* Category filter — stories style */}
        <div className="flex gap-0 overflow-x-auto scrollbar-hide px-4 pt-2 pb-3 max-w-lg mx-auto">
          {([{ key: 'all', emoji: '🏠', label: '전체' }, ...ALL_MODES.map(m => ({ key: m, emoji: TAG_META[m].emoji, label: m }))]).map(({ key, emoji, label }) => {
            const on = filter === key
            return (
              <button key={key}
                onClick={() => setFilter(key as HealthMode | 'all')}
                className="flex flex-col items-center gap-1 mr-4 flex-shrink-0 transition-all">
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all',
                  on ? 'ring-2 ring-offset-2 ring-rose-400' : 'ring-1 ring-slate-200')}
                  style={{ background: on ? 'linear-gradient(135deg,#fce7f3,#ede9fe)' : '#f8fafc' }}>
                  {emoji}
                </div>
                <span className={cn('text-[10px] font-semibold', on ? 'text-rose-500' : 'text-slate-500')}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="max-w-lg mx-auto">
        {feed.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">{query ? '🔍' : '📭'}</p>
            <p className="text-sm text-slate-400 font-medium">
              {query ? `"${query}" 검색 결과가 없어요` : '아직 게시물이 없어요'}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              {query ? '다른 검색어나 #해시태그를 입력해보세요' : '+ 버튼을 눌러 첫 번째 레시피를 공유해보세요!'}
            </p>
          </div>
        ) : (
          feed.map(post => (
            <PostCard key={post.id} post={post}
              liked={liked.has(post.id)} saved={saved.has(post.id)}
              currentUserId={user?.userId}
              currentUserName={authorName} currentUserEmoji={authorEmoji}
              onLike={handleLike} onSave={handleSave}
              onDelete={handleDelete} onAddComment={handleAddComment} />
          ))
        )}
      </div>

      {/* ── Write modal ── */}
      {showWrite && (
        <WriteModal
          authorName={authorName} authorEmoji={authorEmoji}
          onClose={() => setShowWrite(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
