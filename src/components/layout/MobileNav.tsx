'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarHeart, Microscope,
  Settings, ShoppingBag, Activity, Leaf
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',           icon: LayoutDashboard, label: '홈' },
  { href: '/cycle',      icon: Activity,        label: '사이클' },
  { href: '/calendar',   icon: CalendarHeart,   label: '캘린더' },
  { href: '/garden',     icon: Leaf,            label: '정원' },
  { href: '/diagnostic', icon: Microscope,      label: '진단' },
  { href: '/shop',       icon: ShoppingBag,     label: '샵' },
  { href: '/settings',   icon: Settings,        label: '설정' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(244,63,117,0.1)',
        boxShadow: '0 -4px 24px rgba(244,63,117,0.07)',
      }}>
      <div className="flex items-center justify-around px-0.5 py-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl min-w-0 flex-1 transition-all duration-200">
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-rose-500 shadow-soft'
                  : 'bg-transparent'
              )}>
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
              </div>
              <span className={cn(
                'text-[10px] font-medium truncate w-full text-center',
                isActive ? 'text-rose-500' : 'text-slate-400'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
