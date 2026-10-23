'use client'

// 루디아피드 — 게시물 데이터·카드·앨범·글쓰기를 모아둔 공용 모듈.
// 루디아피드 메뉴(src/app/(app)/care)에서 전체 피드와 케어카드별 피드를 보여줄 때 써요.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Camera, Send, X, Plus, Check, Search, Sparkles, Flame, Loader2, ChevronDown, LayoutGrid, Rows3, Images, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { CARE_CASES } from '@/data/careCases'
import { analyzeFeedPost, DAILY_REFERENCE, type FeedNutrition } from '@/lib/feed-nutrition'
import MineralBars from '@/components/nutrition/MineralBars'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SnsComment {
  id: string
  authorName: string
  authorEmoji: string
  text: string
  createdAt: string
}

export interface SnsPost {
  id: string
  authorId: string
  authorName: string
  authorEmoji: string
  authorVerified?: boolean
  createdAt: string
  type: PostType
  title: string
  content: string
  image?: string   // 하위 호환용 (단일 이미지 기존 게시글)
  images?: string[] // 다중 이미지
  coverEmoji?: string
  coverGradient?: string
  tags: string[]   // CareCase id 배열 (src/data/careCases.ts)
  likes: number
  saved?: boolean
  comments: SnsComment[]
  nutrition?: FeedNutrition // 사진 속 음식·음료 칼로리/영양성분 분석 결과
  /** 자세·영법 영상 — 유튜브 링크 또는 mp4 등 영상 파일 주소 */
  video?: string
  /** 운동 글의 종목 (예: 수영, 테니스) */
  sport?: string
}

export type PostType = 'recipe' | 'tip' | 'exercise'

export const POST_TYPE_META: Record<PostType, { label: string; emoji: string; bg: string; color: string; border: string; soft: string }> = {
  recipe:   { label: '레시피',   emoji: '🍳', bg: 'rgba(234,179,8,0.15)',  color: '#a16207', border: '#ca8a04', soft: '#fefce8' },
  tip:      { label: '팁',       emoji: '💡', bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8', border: '#2563eb', soft: '#eff6ff' },
  exercise: { label: '운동·자세', emoji: '🏃‍♀️', bg: 'rgba(16,185,129,0.14)', color: '#047857', border: '#059669', soft: '#ecfdf5' },
}

/** 유튜브 주소면 embed 주소로, 영상 파일이면 그대로 — 알 수 없는 주소는 null */
export function parseVideo(url: string): { kind: 'youtube'; src: string } | { kind: 'file'; src: string } | null {
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) return null
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` }
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return { kind: 'file', src: u }
  return null
}

// ── Storage ────────────────────────────────────────────────────────────────

const POSTS_KEY  = 'ludia_sns_v5'
const LIKES_KEY  = 'ludia_sns_likes_v5'
const SAVES_KEY  = 'ludia_sns_saves_v5'
const VIEW_KEY   = 'ludia_sns_view_v2'  // v2: 루디아피드 화면은 처음에 목록으로 보여줘요

// ── 운동·자세 피드 (수영 영법, 테니스·골프·배드민턴 자세, 러닝·근력) ─────────────
// 영상은 글쓴이가 유튜브 링크나 영상 파일 주소를 붙이면 카드 위에 바로 재생돼요.
const H = 3600000
const EXERCISE_SEED: SnsPost[] = [
  {
    id: 'ex-swim-free', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - H * 2).toISOString(),
    type: 'exercise', sport: '수영', title: '자유형 호흡, 고개를 들지 말고 돌리세요',
    content: '자유형이 금방 숨찬 이유는 대부분 호흡 자세예요 🏊‍♀️\n\n✅ 핵심 3가지\n① 고개는 드는 게 아니라 몸통과 함께 옆으로 굴려요. 한쪽 눈과 입이 수면 위로 나올 만큼만.\n② 물속에서는 코로 "음—" 하고 계속 내쉬고, 고개를 돌렸을 때 입으로 짧게 들이마셔요.\n③ 호흡하는 동안 반대쪽 팔은 앞으로 길게 뻗어 두어야 몸이 가라앉지 않아요.\n\n🚫 자주 하는 실수\n• 숨을 참았다가 한 번에 내쉬기 → 들이마실 시간이 부족해요\n• 정면을 보며 고개 들기 → 다리가 가라앉아요\n\n🏋️ 연습법: 킥판 잡고 한 팔 자유형 25m × 4회, 3스트로크마다 양쪽 번갈아 호흡',
    coverEmoji: '🏊‍♀️', coverGradient: 'linear-gradient(135deg,#e0f2fe,#7dd3fc)',
    tags: ['musculoskeletal_lymph', 'weight_metabolic'], likes: 356,
    comments: [
      { id: 'ex-c1', authorName: '수린이', authorEmoji: '🐠', text: '코로 계속 내쉬는 거 하니까 25m 처음으로 안 쉬고 갔어요!', createdAt: new Date(Date.now() - H).toISOString() },
    ],
  },
  {
    id: 'ex-swim-breast', authorId: 'user-ex1', authorName: '새벽수영러', authorEmoji: '🐸',
    createdAt: new Date(Date.now() - H * 9).toISOString(),
    type: 'exercise', sport: '수영', title: '평영 발차기, 무릎이 아프다면 꼭 보세요',
    content: '평영 발차기 하다가 무릎 안쪽이 시큰했는데 자세를 고치고 나아졌어요 🐸\n\n① 발뒤꿈치를 엉덩이 쪽으로 당길 때 무릎은 골반 너비 정도만 벌려요 (너무 넓으면 무릎 부담↑)\n② 발목을 꺾어 발바닥이 바깥을 보게 한 뒤\n③ 발바닥으로 물을 뒤로 밀며 다리를 모아요 — 원을 그리듯\n④ 다 모은 뒤 1초 쭉 뻗어 미끄러지기(글라이드)\n\n💡 "당기고–꺾고–차고–쉬고" 4박자로 세면서 연습하면 쉬워요\n⚠️ 무릎 통증이 계속되면 평영 대신 자유형·배영으로 바꾸고 쉬어 주세요',
    coverEmoji: '🐸', coverGradient: 'linear-gradient(135deg,#ccfbf1,#5eead4)',
    tags: ['musculoskeletal_lymph'], likes: 188,
    comments: [],
  },
  {
    id: 'ex-swim-back', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - H * 20).toISOString(),
    type: 'exercise', sport: '수영', title: '배영 — 굽은 등·거북목에 좋은 영법',
    content: '책상 앞에 오래 앉는 분께 배영을 추천해요. 가슴이 열리고 등 뒤 근육을 써요 🌊\n\n① 귀가 물에 잠기게 머리를 뒤로 기대고, 시선은 천장\n② 배꼽을 살짝 끌어올려 엉덩이가 가라앉지 않게\n③ 팔은 새끼손가락부터 입수, 물속에서 허벅지 쪽으로 밀어내기\n④ 발차기는 무릎이 아니라 허벅지에서 시작, 수면을 살짝 끓이듯\n\n💡 처음엔 킥판을 가슴에 안고 발차기만 연습해요\n⚠️ 임신 중기 이후에는 오래 누운 자세가 불편할 수 있어 짧게 끊어서 해요',
    coverEmoji: '🌊', coverGradient: 'linear-gradient(135deg,#dbeafe,#93c5fd)',
    tags: ['posture_correction', 'musculoskeletal_lymph'], likes: 241,
    comments: [],
  },
  {
    id: 'ex-tennis-forehand', authorId: 'user-ex2', authorName: '테니스3년차', authorEmoji: '🎾',
    createdAt: new Date(Date.now() - H * 14).toISOString(),
    type: 'exercise', sport: '테니스', title: '포핸드가 자꾸 뜰 때 — 유닛 턴부터',
    content: '포핸드가 네트를 넘어 멀리 날아가거나 손목이 아프다면, 팔보다 몸통 회전을 먼저 보세요 🎾\n\n① 유닛 턴: 공이 오면 라켓만 빼지 말고 어깨·골반을 함께 옆으로 돌려요\n② 왼손(오른손잡이 기준)은 공을 가리키며 앞에 두기 — 회전 축이 돼요\n③ 공은 몸 앞쪽, 앞발보다 살짝 앞에서 맞히기\n④ 팔로우는 반대 어깨 위로 감아 올리기 (와이퍼처럼)\n\n🚫 손목으로 덮어 치기 → 테니스 엘보 원인\n💡 랠리 전에 섀도 스윙 20회로 몸통 회전 감 잡기',
    coverEmoji: '🎾', coverGradient: 'linear-gradient(135deg,#ecfccb,#bef264)',
    tags: ['posture_correction'], likes: 173,
    comments: [
      { id: 'ex-c2', authorName: '라린이', authorEmoji: '🌱', text: '왼손으로 공 가리키기 하니까 타이밍이 맞기 시작했어요', createdAt: new Date(Date.now() - H * 10).toISOString() },
    ],
  },
  {
    id: 'ex-tennis-serve', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - H * 30).toISOString(),
    type: 'exercise', sport: '테니스', title: '어깨 안 다치는 서브 — 토스와 트로피 자세',
    content: '서브는 어깨 부상이 가장 많은 동작이에요. 팔 힘보다 다리와 토스가 먼저예요 🎾\n\n① 토스: 손바닥에 공을 올리고 팔을 쭉 편 채 들어 올리며 손을 펴서 놓기 (손목 튕기지 않기)\n② 공은 앞발 앞, 머리 위 약간 오른쪽(오른손잡이)\n③ 트로피 자세: 무릎을 굽히고, 라켓 든 팔꿈치는 어깨 높이, 왼팔은 공을 향해\n④ 다리를 펴며 위로 뻗어 가장 높은 지점에서 맞히기\n\n⚠️ 어깨가 찌릿하면 그날은 서브 연습을 멈추고, 밴드로 회전근 강화부터\n💡 준비운동: 밴드 외회전 15회 × 2세트',
    coverEmoji: '🏆', coverGradient: 'linear-gradient(135deg,#fef9c3,#fde047)',
    tags: ['posture_correction', 'musculoskeletal_lymph'], likes: 129,
    comments: [],
  },
  {
    id: 'ex-golf-address', authorId: 'user-ex3', authorName: '골린이탈출', authorEmoji: '⛳',
    createdAt: new Date(Date.now() - H * 26).toISOString(),
    type: 'exercise', sport: '골프', title: '어드레스만 바꿔도 허리가 덜 아파요',
    content: '라운드 다녀오면 허리가 아팠는데, 프로님이 어드레스부터 고쳐 주셨어요 ⛳\n\n① 발은 어깨너비, 무릎은 살짝만 굽히기\n② 허리를 숙이는 게 아니라 고관절(골반)을 접어 상체를 기울여요 — 엉덩이가 뒤로 빠지는 느낌\n③ 등은 곧게, 팔은 어깨에서 힘 빼고 자연스럽게 떨어뜨리기\n④ 체중은 발 앞꿈치와 뒤꿈치 사이 가운데\n\n🚫 등을 둥글게 말기 → 스윙 때 허리가 비틀려요\n💡 거울 옆에서 클럽을 등에 대고 머리·등·엉덩이가 클럽에 닿게 연습',
    coverEmoji: '⛳', coverGradient: 'linear-gradient(135deg,#dcfce7,#86efac)',
    tags: ['posture_correction'], likes: 152,
    comments: [],
  },
  {
    id: 'ex-golf-swing', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - H * 44).toISOString(),
    type: 'exercise', sport: '골프', title: '백스윙은 팔이 아니라 몸통으로',
    content: '팔로만 들어 올리는 백스윙은 힘도 안 실리고 어깨·팔꿈치에 무리가 가요 🏌️‍♀️\n\n① 테이크어웨이: 손·팔·어깨가 이루는 삼각형을 유지한 채 몸통과 함께 출발\n② 백스윙 톱: 등이 목표 반대쪽을 볼 만큼 어깨 회전, 골반은 그보다 적게\n③ 다운스윙: 골반이 먼저 목표 쪽으로 돌아오고 팔은 따라오기\n④ 피니시: 체중은 왼발(오른손잡이)에, 오른발은 뒤꿈치가 들린 채\n\n💡 집에서: 수건을 양 겨드랑이에 끼고 하프 스윙 — 수건이 떨어지면 팔만 쓴 거예요\n🧘 스윙 전 흉추 회전 스트레칭 10회',
    coverEmoji: '🏌️‍♀️', coverGradient: 'linear-gradient(135deg,#d1fae5,#6ee7b7)',
    tags: ['posture_correction', 'musculoskeletal_lymph'], likes: 117,
    comments: [],
  },
  {
    id: 'ex-badminton-clear', authorId: 'user-ex4', authorName: '배드민턴동호회', authorEmoji: '🏸',
    createdAt: new Date(Date.now() - H * 18).toISOString(),
    type: 'exercise', sport: '배드민턴', title: '하이클리어가 코트 끝까지 안 갈 때',
    content: '클리어가 중간에 떨어진다면 팔 힘이 아니라 준비 자세와 회전이 문제예요 🏸\n\n① 셔틀콕이 오면 오른발을 뒤로 빼며 몸을 옆으로 (가슴이 옆줄을 보게)\n② 왼손은 셔틀콕을 가리키며 높이 들기\n③ 라켓은 등 뒤로 떨어뜨렸다가, 팔꿈치가 먼저 앞으로 나오며 채찍처럼\n④ 맞는 순간 전완을 안쪽으로 돌리기(회내) — 손목을 꺾는 게 아니에요\n\n💡 그립은 악수하듯 느슨하게 쥐었다가 맞는 순간만 꽉\n⚠️ 어깨가 아프면 스윙 크기를 줄이고 하체 이동을 먼저 연습',
    coverEmoji: '🏸', coverGradient: 'linear-gradient(135deg,#fae8ff,#f0abfc)',
    tags: ['weight_metabolic', 'posture_correction'], likes: 97,
    comments: [],
  },
  {
    id: 'ex-running-form', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - H * 38).toISOString(),
    type: 'exercise', sport: '러닝', title: '무릎 덜 아픈 러닝 자세 4가지',
    content: '러닝 시작하고 무릎·정강이가 아프다면 보폭부터 줄여 보세요 🏃‍♀️\n\n① 발은 몸 바로 아래에 착지 — 앞으로 멀리 뻗으면 브레이크가 걸려요\n② 보폭은 짧게, 발걸음은 빠르게 (1분에 170회 전후를 목표로)\n③ 상체는 발목부터 살짝 앞으로 기울이고 시선은 10~20m 앞\n④ 팔은 90도로 굽혀 앞뒤로, 어깨는 내리고 주먹은 가볍게\n\n💡 처음엔 "1분 달리기 + 2분 걷기" × 8회부터\n🩸 생리 기간·황체기 후반엔 속도를 낮추고 대화 가능한 강도로',
    coverEmoji: '🏃‍♀️', coverGradient: 'linear-gradient(135deg,#ffe4e6,#fda4af)',
    tags: ['weight_metabolic', 'musculoskeletal_lymph'], likes: 284,
    comments: [
      { id: 'ex-c3', authorName: '런린이', authorEmoji: '👟', text: '보폭 줄이니까 정강이 통증이 사라졌어요 신기해요', createdAt: new Date(Date.now() - H * 30).toISOString() },
    ],
  },
  {
    id: 'ex-squat-form', authorId: 'user-ex5', authorName: 'PT받는중', authorEmoji: '🏋️‍♀️',
    createdAt: new Date(Date.now() - H * 52).toISOString(),
    type: 'exercise', sport: '헬스', title: '스쿼트할 때 무릎이 안으로 모인다면',
    content: '트레이너님께 제일 많이 지적받은 스쿼트 자세 정리해요 🏋️‍♀️\n\n① 발은 골반~어깨너비, 발끝은 살짝 바깥으로 (15~30도)\n② 앉을 때 엉덩이를 뒤로 빼며 의자에 앉듯이\n③ 무릎은 두 번째 발가락 방향으로 — 안으로 모이지 않게 바깥으로 밀어요\n④ 발바닥 전체(특히 뒤꿈치)로 바닥을 밀며 일어나기\n\n🚫 무릎이 안으로 모이면(무릎 내반) 무릎 인대에 부담이 커요\n💡 무릎 위에 미니밴드를 걸고 밴드를 벌리듯 연습하면 금방 잡혀요\n🦵 엉덩이(중둔근) 강화: 사이드 라잉 레그레이즈 15회 × 3세트',
    coverEmoji: '🏋️‍♀️', coverGradient: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
    tags: ['weight_metabolic', 'posture_correction'], likes: 198,
    comments: [],
  },
]

const SEED: SnsPost[] = [
  {
    id: 'official-1', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    type: 'recipe', title: '연어 아보카도 덮밥',
    content: '임신 중 DHA 보충에 딱 맞는 한 그릇 레시피예요 🐟\n\n재료 (1인분)\n• 훈제연어 80g\n• 아보카도 1/2개\n• 시금치 한 줌\n• 현미밥 150g\n• 레몬즙 1작은술, 간장 1작은술\n\n만드는 법\n① 시금치를 30초 데쳐 참기름·소금으로 무쳐요\n② 아보카도를 얇게 슬라이스\n③ 밥 위에 재료를 색깔별로 올리고\n④ 레몬즙+간장 소스를 뿌리면 완성!\n\n🔥 520kcal · DHA 1,800mg',
    coverEmoji: '🍱', coverGradient: 'linear-gradient(135deg,#d1fae5,#6ee7b7)',
    tags: ['hormone_female'], likes: 147,
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
    tags: ['disease_postcare'], likes: 203,
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
    tags: ['weight_metabolic'], likes: 312,
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
    tags: ['hormone_female'], likes: 178,
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
    tags: ['disease_postcare'], likes: 94,
    comments: [],
  },
  {
    id: 'seed-3', authorId: 'user-3', authorName: '건강덕후', authorEmoji: '💪',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    type: 'tip', title: '고단백 아침 식사 루틴 공유',
    content: '다이어트 6개월째, 아침 루틴 공유해요!\n\n그릭요거트 100g + 블루베리 50g + 아몬드 10g + 꿀 1작은술\n\n이게 다예요 😂 10분도 안 걸리는데 단백질 10g + 항산화 챙기기 완료!\n\n포인트는 그릭요거트를 플레인으로 사는 것 (가당 피하기). 달콤함은 꿀로 조절하면 훨씬 건강해요.\n\n1kg 빠지는 데 이게 제일 도움 됐어요. 저처럼 아침에 귀찮으신 분들께 강추 🙌',
    coverEmoji: '🫙', coverGradient: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)',
    tags: ['weight_metabolic'], likes: 267,
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
    tags: ['weight_metabolic'], likes: 421,
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
    tags: ['hormone_female'], likes: 534,
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
    tags: ['weight_metabolic'], likes: 389,
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
    tags: ['weight_metabolic'], likes: 298,
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
    tags: ['hormone_female'], likes: 445,
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
    tags: ['disease_postcare'], likes: 167,
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
    tags: ['weight_metabolic'], likes: 58,
    comments: [
      { id: 'cm1', authorName: '다이어터', authorEmoji: '🏃', text: '사진으로 보니까 훨씬 쉬워 보여요! 도전해볼게요 🙌', createdAt: new Date(Date.now() - 1800000).toISOString() },
    ],
  },
  {
    id: 'official-7', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    type: 'tip', title: '두피 열 내리는 저녁 루틴 3가지',
    content: '퇴근 후 5분이면 충분해요, 두피 상열 내리는 루틴이에요 💇\n\n① 정수리 지압 30초\n엄지로 백회혈을 천천히 눌러 순환 촉진\n\n② 미온수→찬물 순서로 두피 마무리 세정\n마지막에 찬물로 헹구면 모세혈관 수축이 완화돼요\n\n③ 목 뒤 온찜질 10분\n상열하한 체질일수록 목·어깨가 뭉쳐 두피 혈류가 막혀요\n\n💡 두피가 유난히 뜨겁고 정수리가 가렵다면 상열 체질일 가능성이 높아요. 4주만 꾸준히 해보세요!',
    coverEmoji: '💇', coverGradient: 'linear-gradient(135deg,#fce7f3,#f9a8d4)',
    tags: ['hair_scalp'], likes: 121,
    comments: [
      { id: 'c18', authorName: '탈모고민', authorEmoji: '😥', text: '찬물 마무리 진짜 효과 있네요, 감사해요!', createdAt: new Date(Date.now() - 5000000).toISOString() },
    ],
  },
  {
    id: 'official-8', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
    type: 'recipe', title: '테스토스테론 챙기는 아연 듬뿍 덮밥',
    content: '벌크업할 때 단백질만큼 중요한 게 아연이에요 💪\n\n재료 (1인분)\n• 훈제굴 또는 새우 100g\n• 현미밥 200g\n• 달걀노른자 1개\n• 아보카도 1/2개\n• 마늘 1쪽, 참기름·소금 약간\n\n만드는 법\n① 굴·새우를 마늘과 함께 살짝 볶기\n② 현미밥 위에 아보카도, 달걀노른자 올리기\n③ 참기름·소금으로 간하면 완성\n\n💡 아연은 남성호르몬 합성의 필수 미네랄이에요. 좋은 지방(아보카도)과 함께 먹으면 흡수율이 더 올라가요.\n🔥 560kcal · 아연 8.2mg',
    coverEmoji: '🦪', coverGradient: 'linear-gradient(135deg,#dbeafe,#7dd3fc)',
    tags: ['male_wellness'], likes: 96,
    comments: [],
  },
  {
    id: 'official-9', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    type: 'tip', title: '거북목·굽은등 펴는 데스크 스트레칭',
    content: '하루 종일 앉아있다 보면 나도 모르게 C커브가 무너져요 🧍\n\n① 턱 당기기 (더블친 스트레칭)\n턱을 뒤로 천천히 당겨 5초 유지, 10회\n\n② 가슴 열기\n양손을 등 뒤에서 깍지 끼고 어깨를 뒤로, 가슴 펴기 15초 x 3회\n\n③ 승모근 스트레칭\n한쪽 귀를 어깨 쪽으로 기울이고 반대손으로 지그시 눌러주기 20초씩\n\n④ 벽에 등 붙이고 서기\n뒤통수·어깨·엉덩이·발꿈치가 벽에 닿게 1분\n\n💡 매시간 1분씩만 해도 골반·척추 틀어짐 예방에 큰 도움이 돼요!',
    coverEmoji: '🧍', coverGradient: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
    tags: ['posture_correction'], likes: 214,
    comments: [
      { id: 'c19', authorName: '거북목직장인', authorEmoji: '💻', text: '벽에 등붙이기 해보니까 자세가 얼마나 틀어졌는지 알겠어요 ㅠㅠ', createdAt: new Date(Date.now() - 9000000).toISOString() },
    ],
  },
  {
    id: 'official-10', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    type: 'recipe', title: '장 청소 식이섬유 오버나이트 오트밀',
    content: '아침이 편해지는 장 디톡스 한 그릇이에요 🌱\n\n재료 (1인분)\n• 귀리 50g\n• 무가당 두유 150ml\n• 치아씨드 1큰술\n• 냉동 베리류 한 줌\n• 사과 1/4개\n\n만드는 법\n① 귀리·두유·치아씨드를 유리병에 넣고 잘 섞기\n② 냉장고에서 8시간 이상 불리기(전날 밤 준비)\n③ 아침에 베리·사과 올려 완성\n\n💡 치아씨드는 물을 흡수하며 장 속 노폐물을 함께 배출시켜줘요. SIBO나 가스가 잦다면 소량부터 시작하세요.\n🔥 320kcal · 식이섬유 11g',
    coverEmoji: '🥣', coverGradient: 'linear-gradient(135deg,#ccfbf1,#5eead4)',
    tags: ['gut_detox'], likes: 143,
    comments: [],
  },
  {
    id: 'official-11', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 33).toISOString(),
    type: 'tip', title: '번아웃 왔을 때 부신 회복시키는 습관',
    content: '계속 피곤하고 예민하다면 부신이 지쳐있는 신호일 수 있어요 🧠\n\n✅ 지금 바로 시작할 수 있는 것들\n• 기상 후 15분 이내 햇빛 보기 — 코르티솔 리듬 정상화\n• 오후 2시 이후 카페인 끊기 — 야간 코르티솔 급등 방지\n• 4-7-8 호흡법 하루 3세트 — 4초 들이쉬고, 7초 참고, 8초 내쉬기\n• 자기 전 스마트폰 대신 종이책 10분\n\n⚠️ 이유 없이 어지럽거나 브레인 포그가 2주 이상 지속되면 전문가 상담을 권해요.\n\n작은 루틴이 쌓이면 자율신경이 서서히 안정돼요 🌙',
    coverEmoji: '🧠', coverGradient: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
    tags: ['mental_brain'], likes: 187,
    comments: [
      { id: 'c20', authorName: '번아웃중', authorEmoji: '😮‍💨', text: '오후 카페인 끊었더니 진짜 잠이 잘 와요', createdAt: new Date(Date.now() - 12000000).toISOString() },
    ],
  },
  {
    id: 'official-12', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    type: 'tip', title: '장-피부 축 관리로 속건조 잡는 법',
    content: '겉만 촉촉하게 바르는 걸로는 한계가 있어요, 피부는 장에서 시작돼요 ✨\n\n✅ 장-피부 축을 살리는 습관\n• 발효식품(요거트, 김치) 매일 조금씩\n• 정제당·밀가루 줄이기 — 인슐린 스파이크가 여드름·홍조를 유발해요\n• 오메가3(등푸른생선, 아마씨유)로 염증 반응 낮추기\n• 물 하루 1.5L 이상, 특히 기상 직후 한 잔\n\n💧 속건조 홍조가 있다면 장 염증부터 의심해보세요. 2~3주만 식단을 바꿔도 피부 결이 달라지는 걸 느낄 수 있어요.',
    coverEmoji: '✨', coverGradient: 'linear-gradient(135deg,#fef3c7,#fcd34d)',
    tags: ['skin_beauty'], likes: 176,
    comments: [],
  },
  {
    id: 'official-13', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 55).toISOString(),
    type: 'tip', title: '하체 부종 빼는 림프 마사지 루틴',
    content: '퇴근 후 붓기 심한 다리, 이렇게 풀어보세요 🦴\n\n① 종아리 쓸어올리기\n발목→무릎 방향으로 손바닥 전체로 10회씩\n\n② 무릎 뒤 림프절 자극\n무릎 뒤를 가볍게 원 그리며 20초 눌러주기\n\n③ 벽에 다리 올리고 5분 눕기\n골반 정맥 울혈이 풀리고 순환이 촉진돼요\n\n④ 폼롤러로 허벅지 바깥쪽 풀기\n좌우 각 1분씩\n\n💡 오래 서있거나 앉아있는 직업이라면 2시간마다 종아리 펌프 운동(까치발 20회)만 해줘도 부종이 확 줄어요!',
    coverEmoji: '🦴', coverGradient: 'linear-gradient(135deg,#cffafe,#67e8f9)',
    tags: ['musculoskeletal_lymph'], likes: 165,
    comments: [
      { id: 'c21', authorName: '하체부종러', authorEmoji: '🦵', text: '벽에 다리 올리기 매일 하는데 진짜 효과 좋아요', createdAt: new Date(Date.now() - 30000000).toISOString() },
    ],
  },
  {
    id: 'official-14', authorId: 'ludia', authorName: '루디아', authorEmoji: '💜', authorVerified: true,
    createdAt: new Date(Date.now() - 3600000 * 70).toISOString(),
    type: 'tip', title: '갑상선·자궁 건강, 셀프로 체크하는 법',
    content: '병원 가기 전, 집에서 미리 살펴볼 수 있는 신호들이에요 🩺\n\n✅ 갑상선 이상 신호\n• 이유 없이 추위를 많이 타거나 반대로 열감이 심함\n• 목 앞쪽이 부어 보이거나 삼킬 때 이물감\n• 급격한 체중 변화 (원인 불명)\n\n✅ 자궁·난소 이상 신호\n• 기초체온이 2주 이상 고온기를 유지하지 못함\n• 생리 주기가 두 달 연속 21일 미만 또는 40일 초과\n• 생리량이 갑자기 2배 이상 늘거나 줄어듦\n\n⚠️ 위 신호가 2개 이상 겹치면 정기 검진을 앞당기는 걸 권해요. 조기에 발견하면 관리가 훨씬 쉬워요.',
    coverEmoji: '🩺', coverGradient: 'linear-gradient(135deg,#dbeafe,#93c5fd)',
    tags: ['organ_monitoring'], likes: 209,
    comments: [],
  },
  ...EXERCISE_SEED,
]

function loadPosts(): SnsPost[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(POSTS_KEY)
    if (s) {
      // 새로 추가된 기본 글(예: 운동·자세 피드)은 기존 사용자에게도 넣어줘요
      const saved = JSON.parse(s) as SnsPost[]
      const have = new Set(saved.map(p => p.id))
      const added = SEED.filter(p => !have.has(p.id))
      if (added.length === 0) return saved
      const merged = [...saved, ...added]
      localStorage.setItem(POSTS_KEY, JSON.stringify(merged))
      return merged
    }
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

// 케어카드(src/data/careCases.ts) 11종 기준으로 피드 카테고리를 구성
export const CARE_BY_ID = Object.fromEntries(CARE_CASES.map(c => [c.id, c]))

export const CARE_SHORT: Record<string, string> = {
  hair_scalp: '탈모', weight_metabolic: '체중', male_wellness: '남성웰니스',
  posture_correction: '체형교정', gut_detox: '장건강', mental_brain: '멘탈',
  hormone_female: '호르몬', disease_postcare: '질환관리', skin_beauty: '피부',
  musculoskeletal_lymph: '근골격', organ_monitoring: '모니터링', senior_wellness: '시니어',
}

export function careAccent(gradient: string) {
  return gradient.match(/#[0-9a-fA-F]{6}/)?.[0] ?? '#f43f75'
}

export function careMeta(id: string) {
  const c = CARE_BY_ID[id]
  if (!c) return { label: id, Icon: undefined, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return { label: CARE_SHORT[id] ?? c.label, Icon: c.icon, color: careAccent(c.gradient), bg: c.bg }
}

export const AUTHOR_EMOJIS = ['🌸','🌿','💪','✨','🦋','🌻','🍀','💜','🌺','🌙','⭐','🔥','🎯','🌈']

// ── Post card ──────────────────────────────────────────────────────────────

export function PostCard({
  post, liked, saved, currentUserId, currentUserName, currentUserEmoji,
  analyzing, onLike, onSave, onDelete, onAddComment, onAnalyze,
}: {
  post: SnsPost
  liked: boolean; saved: boolean
  currentUserId: string | undefined
  currentUserName: string; currentUserEmoji: string
  onLike: (id: string) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  onAddComment: (postId: string, text: string) => void
  analyzing: boolean
  onAnalyze: (id: string) => void
}) {
  const [expanded, setExpanded]       = useState(false)
  const [showNutrition, setShowNutrition] = useState(false)
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
  const nutrition = post.nutrition
  const typeMeta = POST_TYPE_META[post.type] ?? POST_TYPE_META.tip
  const video = post.video ? parseVideo(post.video) : null

  // 분석이 끝나면 결과 패널을 바로 펼쳐 보여줘요
  const wasAnalyzing = useRef(analyzing)
  useEffect(() => {
    if (wasAnalyzing.current && !analyzing && post.nutrition) setShowNutrition(true)
    wasAnalyzing.current = analyzing
  }, [analyzing, post.nutrition])

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
              style={{ background: typeMeta.bg, color: typeMeta.color }}>
              {typeMeta.emoji} {post.sport ?? typeMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-400">{timeAgo(post.createdAt)}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px]">🌐</span>
            {post.tags.map(t => {
              const meta = careMeta(t)
              return (
                <span key={t} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color }}>
                  {meta.Icon && <meta.Icon className="w-2.5 h-2.5" />} {meta.label}
                </span>
              )
            })}
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

      {/* ── 자세·영법 영상 ── */}
      {video && (
        <div className="w-full bg-black" style={{ aspectRatio: '16/9' }}>
          {video.kind === 'youtube' ? (
            <iframe src={video.src} title={post.title} className="w-full h-full" loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
          ) : (
            <video src={video.src} controls playsInline preload="metadata" className="w-full h-full" />
          )}
        </div>
      )}

      {/* ── Image carousel ── */}
      {(hasImages || (post.coverEmoji && !video)) && (
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

              {/* 칼로리 분석 칩 — 결과가 있으면 kcal 배지, 없으면 분석 버튼 */}
              <button
                onClick={() => nutrition ? setShowNutrition(v => !v) : onAnalyze(post.id)}
                disabled={analyzing}
                className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md transition-all active:scale-95"
                style={{
                  background: nutrition?.isFood ? 'rgba(0,0,0,0.6)' : 'linear-gradient(135deg,#f43f75,#a855f7)',
                  backdropFilter: 'blur(6px)',
                }}>
                {analyzing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> 분석 중...</>
                ) : nutrition?.isFood ? (
                  <><Flame className="w-3 h-3 text-orange-300" /> {Math.round(nutrition.total.calories).toLocaleString()} kcal</>
                ) : nutrition ? (
                  <><Sparkles className="w-3 h-3" /> 분석 결과</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> 칼로리 분석</>
                )}
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <span className="text-6xl leading-none">{post.coverEmoji ?? '🍽️'}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 칼로리·영양성분 패널 ── */}
      {nutrition && showNutrition && (
        <NutritionPanel nutrition={nutrition} reanalyzing={analyzing}
          onReanalyze={hasImages ? () => onAnalyze(post.id) : undefined}
          onClose={() => setShowNutrition(false)} />
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

// ── Nutrition panel ────────────────────────────────────────────────────────

type MacroKey = Exclude<keyof FeedNutrition['total'], 'calories' | 'minerals'>

const MACROS: { key: MacroKey; label: string; unit: string; color: string }[] = [
  { key: 'protein',  label: '단백질',  unit: 'g',  color: '#f43f75' },
  { key: 'carb',     label: '탄수화물', unit: 'g',  color: '#f59e0b' },
  { key: 'fat',      label: '지방',    unit: 'g',  color: '#a855f7' },
  { key: 'sugar',    label: '당류',    unit: 'g',  color: '#ec4899' },
  { key: 'sodium',   label: '나트륨',  unit: 'mg', color: '#0ea5e9' },
  { key: 'caffeine', label: '카페인',  unit: 'mg', color: '#78716c' },
]

function NutritionPanel({ nutrition, reanalyzing, onReanalyze, onClose }: {
  nutrition: FeedNutrition
  reanalyzing: boolean
  onReanalyze?: () => void
  onClose: () => void
}) {
  const { total, items } = nutrition
  const kcalPct = Math.round((total.calories / DAILY_REFERENCE.calories) * 100)

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#fff7fa,#faf5ff)', border: '1px solid rgba(244,63,117,0.14)' }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[12px] font-bold text-slate-700">루디아 영양 분석</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(168,85,247,0.1)', color: '#7e22ce' }}>
            {nutrition.source === 'ai' ? 'AI 사진 분석' : '캡션 기반 추정'}
          </span>
        </div>
        <button onClick={onClose} className="p-1 -mr-1">
          <ChevronDown className="w-4 h-4 text-slate-400 rotate-180" />
        </button>
      </div>

      {nutrition.isFood ? (
        <div className="px-4 pb-4 pt-2">
          {/* 총 칼로리 */}
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900 leading-none">{Math.round(total.calories).toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-500 mb-0.5">kcal</span>
            <span className="text-[11px] text-slate-400 mb-0.5 ml-auto">하루 권장량의 {kcalPct}%</span>
          </div>
          <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(200,200,220,0.35)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, kcalPct)}%`, background: 'linear-gradient(90deg,#f43f75,#a855f7)' }} />
          </div>

          {/* 영양성분 그리드 */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {MACROS.map(m => {
              const v = total[m.key]
              const pct = Math.min(100, Math.round((v / DAILY_REFERENCE[m.key]) * 100))
              return (
                <div key={m.key} className="rounded-xl px-2.5 py-2 bg-white/80">
                  <p className="text-[10px] font-semibold text-slate-400">{m.label}</p>
                  <p className="text-[14px] font-black text-slate-800 leading-tight">
                    {Math.round(v).toLocaleString()}<span className="text-[10px] font-bold text-slate-400 ml-0.5">{m.unit}</span>
                  </p>
                  <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(200,200,220,0.35)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 미네랄 */}
          {total.minerals && <MineralBars minerals={total.minerals} className="mt-3" />}

          {/* 메뉴별 내역 */}
          <div className="mt-3 space-y-1">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span className="w-5 text-center">{it.emoji ?? '🍽️'}</span>
                <span className="flex-1 min-w-0 truncate text-slate-700">{it.name}</span>
                <span className="text-slate-400 text-[11px]">탄 {Math.round(it.carb)} · 단 {Math.round(it.protein)} · 지 {Math.round(it.fat)}</span>
                <span className="font-bold text-slate-800 w-16 text-right">{Math.round(it.calories)} kcal</span>
              </div>
            ))}
          </div>

          {nutrition.summary && (
            <p className="text-[12px] text-slate-600 leading-relaxed mt-3">{nutrition.summary}</p>
          )}
          {nutrition.tip && (
            <p className="text-[12px] font-semibold leading-relaxed mt-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(244,63,117,0.08)', color: '#be123c' }}>
              💡 {nutrition.tip}
            </p>
          )}
        </div>
      ) : (
        <p className="px-4 pb-4 pt-2 text-[12px] text-slate-500 leading-relaxed">{nutrition.summary}</p>
      )}

      <div className="flex items-center justify-between px-4 pb-3">
        <p className="text-[10px] text-slate-400">사진 기준 추정치로 실제와 다를 수 있어요</p>
        {onReanalyze && (
          <button onClick={onReanalyze} disabled={reanalyzing}
            className="text-[11px] font-bold text-rose-500 disabled:text-slate-300">
            {reanalyzing ? '분석 중...' : '다시 분석'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Write modal ────────────────────────────────────────────────────────────

export function WriteModal({
  authorName, authorEmoji, defaultTags = [],
  onClose, onSubmit,
}: {
  authorName: string; authorEmoji: string
  defaultTags?: string[]
  onClose: () => void
  onSubmit: (post: Omit<SnsPost, 'id' | 'createdAt' | 'likes' | 'comments'>) => void
}) {
  const [images,    setImages]    = useState<string[]>([])
  const [content,   setContent]   = useState('')
  const [type,      setType]      = useState<PostType>('recipe')
  const [videoUrl,  setVideoUrl]  = useState('')
  const [sport,     setSport]     = useState('')
  const videoOk = videoUrl.trim() === '' || parseVideo(videoUrl) !== null
  const [tags,      setTags]      = useState<string[]>(defaultTags)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const MAX_IMAGES = 10

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
    if (!content.trim() || !videoOk) return
    const firstLine = content.split('\n')[0].slice(0, 50)
    onSubmit({
      authorId: 'me', authorName, authorEmoji,
      type, title: firstLine, content: content.trim(),
      images: images.length > 0 ? images : undefined,
      video: videoUrl.trim() || undefined,
      sport: type === 'exercise' && sport.trim() ? sport.trim().slice(0, 12) : undefined,
      coverEmoji: type === 'recipe' ? '🍽️' : type === 'exercise' ? '🏃‍♀️' : '💡',
      coverGradient: tags[0] ? CARE_BY_ID[tags[0]]?.gradient : 'linear-gradient(135deg,#fce7f3,#ede9fe)',
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
        <button onClick={submit} disabled={!content.trim() || !videoOk}
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
            placeholder={"오늘 먹은 음식, 카페 메뉴, 레시피나 건강 팁을 공유해보세요...\n\n사진을 올리면 루디아가 칼로리와 영양성분을 자동으로 분석해 드려요 🔥"}
            className="w-full text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed" />
          <p className="text-[11px] text-slate-400 text-right">{content.length} / 2000</p>

          {/* Post type */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">종류</p>
            <div className="flex gap-2">
              {(['recipe', 'tip', 'exercise'] as const).map(t => {
                const m = POST_TYPE_META[t]
                return (
                  <button key={t} onClick={() => setType(t)}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all border"
                    style={type === t
                      ? { background: m.soft, borderColor: m.border, color: m.color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                    }>
                    {m.emoji} {t === 'tip' ? '팁·경험' : m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 운동 종목 */}
          {type === 'exercise' && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">종목</p>
              <div className="flex flex-wrap gap-1.5">
                {['수영', '테니스', '골프', '배드민턴', '러닝', '헬스', '요가', '필라테스'].map(sp => (
                  <button key={sp} onClick={() => setSport(prev => prev === sp ? '' : sp)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={sport === sp
                      ? { background: POST_TYPE_META.exercise.soft, borderColor: POST_TYPE_META.exercise.border, color: POST_TYPE_META.exercise.color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 영상 링크 */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">영상 <span className="font-normal text-slate-400">(선택 · 유튜브 링크나 영상 파일 주소)</span></p>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} inputMode="url"
              placeholder="https://youtu.be/..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border outline-none"
              style={{ borderColor: videoOk ? '#e2e8f0' : '#f87171' }} />
            {!videoOk && <p className="text-[11px] text-red-500 mt-1">유튜브 주소나 .mp4 같은 영상 파일 주소를 넣어주세요</p>}
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">케어카드 <span className="font-normal text-slate-400">(복수 선택)</span></p>
            <div className="flex flex-wrap gap-2">
              {CARE_CASES.map(c => {
                const on = tags.includes(c.id)
                const meta = careMeta(c.id)
                const Icon = meta.Icon
                return (
                  <button key={c.id} onClick={() => setTags(prev => on ? prev.filter(t => t !== c.id) : [...prev, c.id])}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                    style={on
                      ? { background: meta.bg, borderColor: meta.color, color: meta.color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                    }>
                    {Icon && <Icon className="w-3 h-3" />} {meta.label}
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

// ── Album view ─────────────────────────────────────────────────────────────

export type FeedView = 'album' | 'list'

/** 저장된 보기 방식 — 아직 고른 적 없으면 fallback */
export function loadView(fallback: FeedView = 'album'): FeedView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'list' || v === 'album' ? v : fallback
  } catch { return fallback }
}
export function saveView(v: FeedView) { try { localStorage.setItem(VIEW_KEY, v) } catch {} }

/** 앨범처럼 '오늘 · 이번 주 · 이번 달 · 지난 달…'로 묶어요. */
export function albumPeriod(iso: string): { key: string; label: string } {
  const d = new Date(iso)
  const now = new Date()
  const days = (now.getTime() - d.getTime()) / 86400000
  if (d.toDateString() === now.toDateString()) return { key: 'today', label: '오늘' }
  if (days < 7) return { key: 'week', label: '이번 주' }
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return { key: 'month', label: '이번 달' }
  const label = d.getFullYear() === now.getFullYear() ? `${d.getMonth() + 1}월` : `${d.getFullYear()}년 ${d.getMonth() + 1}월`
  return { key: `${d.getFullYear()}-${d.getMonth()}`, label }
}

function AlbumTile({ post, onOpen }: { post: SnsPost; onOpen: () => void }) {
  const images = post.images?.length ? post.images : post.image ? [post.image] : []
  const cover = images[0]
  const kcal = post.nutrition?.isFood ? Math.round(post.nutrition.total.calories) : null
  return (
    <button onClick={onOpen} className="relative aspect-square overflow-hidden bg-slate-100 active:opacity-80 transition-opacity">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={post.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"
          style={{ background: post.coverGradient ?? 'linear-gradient(135deg,#fce7f3,#ede9fe)' }}>
          <span className="text-3xl leading-none">{post.coverEmoji ?? (POST_TYPE_META[post.type] ?? POST_TYPE_META.tip).emoji}</span>
          <span className="text-[10.5px] font-bold text-slate-700 text-center leading-tight line-clamp-2">{post.title}</span>
        </div>
      )}
      {images.length > 1 && (
        <Images className="absolute top-1.5 right-1.5 w-4 h-4 text-white drop-shadow" />
      )}
      {cover && (
        <div className="absolute inset-x-0 bottom-0 px-1.5 pt-4 pb-1 text-left"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
          <p className="text-[10.5px] font-bold text-white truncate">{post.title}</p>
        </div>
      )}
      {kcal !== null && (
        <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <Flame className="w-2.5 h-2.5 text-orange-300" />{kcal.toLocaleString()}
        </span>
      )}
    </button>
  )
}

export function AlbumGrid({ sections, onOpen }: {
  sections: { key: string; label: string; posts: SnsPost[] }[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="pb-2">
      {sections.map(sec => (
        <section key={sec.key} className="mb-3">
          <div className="flex items-baseline gap-1.5 px-4 pt-3 pb-2">
            <h2 className="text-[14px] font-bold text-slate-800">{sec.label}</h2>
            <span className="text-[11px] text-slate-400">{sec.posts.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {sec.posts.map(p => <AlbumTile key={p.id} post={p} onOpen={() => onOpen(p.id)} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
// ── Feed state hook ────────────────────────────────────────────────────────

/** 피드 게시물·좋아요·저장·칼로리 분석 상태와 핸들러 (localStorage 저장) */
export function useFeed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<SnsPost[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())

  const authorName  = user?.nickname || user?.name || '나'
  const authorEmoji = AUTHOR_EMOJIS[Math.abs(authorName.charCodeAt(0)) % AUTHOR_EMOJIS.length]

  useEffect(() => {
    setPosts(loadPosts())
    setLiked(loadLikes())
    setSaved(loadSaves())
  }, [])

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

  // 게시물 사진 속 음식·음료의 칼로리/영양성분을 분석해 게시물에 붙여 저장해요
  const analyzePost = useCallback(async (post: SnsPost) => {
    const images = post.images?.length ? post.images : post.image ? [post.image] : []
    setAnalyzingIds(prev => new Set(prev).add(post.id))
    try {
      const nutrition = await analyzeFeedPost(images, post.content)
      setPosts(prev => {
        const u = prev.map(p => p.id === post.id ? { ...p, nutrition } : p)
        savePosts(u); return u
      })
    } finally {
      setAnalyzingIds(prev => { const n = new Set(prev); n.delete(post.id); return n })
    }
  }, [])

  const handleAnalyze = useCallback((id: string) => {
    const post = posts.find(p => p.id === id)
    if (post) analyzePost(post)
  }, [posts, analyzePost])

  const handleSubmit = useCallback((draft: Omit<SnsPost, 'id' | 'createdAt' | 'likes' | 'comments'>) => {
    const post: SnsPost = { ...draft, authorId: user?.userId ?? draft.authorId, id: `post-${Date.now()}`, createdAt: new Date().toISOString(), likes: 0, comments: [] }
    setPosts(prev => { const u = [post, ...prev]; savePosts(u); return u })
    // 사진을 올리면 바로 칼로리·영양성분 분석을 시작해요
    if (post.images?.length) analyzePost(post)
  }, [analyzePost, user])

  return {
    user, posts, liked, saved, analyzingIds, authorName, authorEmoji,
    handleLike, handleSave, handleDelete, handleAddComment, handleAnalyze, handleSubmit,
  }
}

/** 오늘 · 이번 주 · 이번 달 … 기간별로 묶은 앨범 섹션 */
export function albumSectionsByPeriod(posts: SnsPost[]) {
  const out: { key: string; label: string; posts: SnsPost[] }[] = []
  for (const p of posts) {
    const { key, label } = albumPeriod(p.createdAt)
    const sec = out.find(x => x.key === key)
    if (sec) sec.posts.push(p); else out.push({ key, label, posts: [p] })
  }
  return out
}
