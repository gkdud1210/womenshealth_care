import type { MeetupGroup } from '@/data/meetupData'

// ── 모임 대화방 ──────────────────────────────────────────────────────────────
// 참여 멤버끼리만 이야기하는 그룹 대화. 지금은 기기(localStorage)에 저장돼요.

export const CHAT_KEY      = 'ludia_meetup_chat_v1'
export const CHAT_READ_KEY = 'ludia_meetup_chat_read_v1'

/** 대화방 하나에 보관하는 최대 메시지 수 (사진 때문에 용량이 커지지 않도록) */
const MAX_PER_ROOM = 300

export interface ChatMessage {
  id: string
  groupId: string
  authorId: string
  authorName: string
  authorEmoji: string
  text: string
  image?: string
  createdAt: string
  /** 입장·퇴장 안내 같은 시스템 메시지 */
  system?: boolean
}

export type ChatRooms = Record<string, ChatMessage[]>
/** groupId → 마지막으로 읽은 시각(ISO) */
export type ChatReadMap = Record<string, string>

export function loadChats(): ChatRooms {
  if (typeof window === 'undefined') return {}
  try {
    const s = localStorage.getItem(CHAT_KEY)
    const parsed = s ? JSON.parse(s) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}

export function saveChats(rooms: ChatRooms) {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(rooms)) } catch {}
}

export function loadChatReads(): ChatReadMap {
  if (typeof window === 'undefined') return {}
  try { const s = localStorage.getItem(CHAT_READ_KEY); return s ? JSON.parse(s) : {} } catch { return {} }
}

export function saveChatReads(m: ChatReadMap) {
  try { localStorage.setItem(CHAT_READ_KEY, JSON.stringify(m)) } catch {}
}

export function appendMessage(rooms: ChatRooms, msg: ChatMessage): ChatRooms {
  const room = [...(rooms[msg.groupId] ?? []), msg].slice(-MAX_PER_ROOM)
  return { ...rooms, [msg.groupId]: room }
}

/** 방장이 남긴 첫 인사 — 저장하지 않고 모임 정보로 매번 만들어요. */
export function welcomeMessage(group: MeetupGroup): ChatMessage {
  return {
    id: `welcome-${group.id}`,
    groupId: group.id,
    authorId: group.createdBy,
    authorName: group.createdByName,
    authorEmoji: '🌸',
    text: `${group.name} 대화방에 오신 걸 환영해요! 일정·장소 이야기나 오늘 활동 후기를 편하게 나눠주세요 💕`,
    createdAt: group.createdAt,
  }
}

export function roomMessages(rooms: ChatRooms, group: MeetupGroup): ChatMessage[] {
  return [welcomeMessage(group), ...(rooms[group.id] ?? [])]
}

export function unreadCount(rooms: ChatRooms, reads: ChatReadMap, groupId: string, userId: string): number {
  const since = reads[groupId] ? new Date(reads[groupId]).getTime() : 0
  return (rooms[groupId] ?? []).filter(m =>
    !m.system && m.authorId !== userId && new Date(m.createdAt).getTime() > since,
  ).length
}
