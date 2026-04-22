'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarHeart, Microscope, TrendingUp,
  MessageCircleHeart, ShoppingBag, Settings, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  icon: LayoutDashboard,   label: '대시보드' },
  { href: '/calendar',   icon: CalendarHeart,      label: '건강 캘린더' },
  { href: '/diagnostic', icon: Microscope,         label: '진단 분석' },
  { href: '/program',    icon: TrendingUp,         label: '3개월 프로그램' },
  { href: '/consultant', icon: MessageCircleHeart, label: 'LUDIA 건강상담' },
  { href: '/shop',       icon: ShoppingBag,        label: '맞춤 케어샵' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-40 flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderRight: '1px solid rgba(244, 63, 117, 0.1)',
        boxShadow: '2px 0 24px rgba(244, 63, 117, 0.06)',
      }}>

      {/* Logo */}
      <div className="px-6 py-6" style={{ borderBottom: '1px solid rgba(244,63,117,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-soft flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f43f75 0%, #e11d5a 100%)' }}>
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold rose-text leading-none">Luna</h1>
            <p className="text-2xs text-rose-400/70 mt-0.5 tracking-caps uppercase font-medium">Health Guardian</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn('nav-item', isActive && 'active')}
            >
              <div className={cn('nav-icon', isActive ? 'icon-badge-brand' : 'text-slate-400')}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Profile footer */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(244,63,117,0.08)' }}>
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group hover:bg-rose-50/50">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-gold"
            style={{ background: 'linear-gradient(135deg, #fde68a, #d4af37)' }}>
            <span className="text-sm font-bold text-amber-800">H</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">Hayoung</p>
            <p className="text-xs text-slate-400 truncate">주기 D+14 · 황체기</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-400 transition-colors" />
        </Link>
      </div>
    </aside>
  )
}
