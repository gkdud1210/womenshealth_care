'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Microscope,
  ShoppingBag, Users, ChefHat, HeartPulse
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/diagnostic', icon: Microscope,      label: '진단' },
  { href: '/care',       icon: HeartPulse,      label: '케어' },
  { href: '/ludia-call', icon: ChefHat,         label: '루디아 호출', highlight: true },
  { href: '/community',  icon: Users,           label: '모임' },
  { href: '/shop',       icon: ShoppingBag,     label: '샵' },
] as const

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
      <div className="flex items-end justify-around px-0.5 py-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label, ...rest }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
            || (href === '/shop' && pathname.startsWith('/settings'))
          const highlight = 'highlight' in rest && rest.highlight

          if (highlight) {
            return (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-0.5 px-1 pb-1 rounded-xl min-w-0 flex-1 -mt-5 transition-all duration-200">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                  isActive && 'scale-105'
                )}
                  style={{
                    background: 'linear-gradient(135deg,#f43f75,#a855f7)',
                    boxShadow: '0 6px 18px rgba(244,63,117,0.45)',
                    border: '3px solid #fff',
                  }}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <span className="text-[10px] font-bold truncate w-full text-center" style={{ color: '#e11d5a' }}>
                  {label}
                </span>
              </Link>
            )
          }

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
