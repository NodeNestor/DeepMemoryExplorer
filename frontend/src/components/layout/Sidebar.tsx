import { NavLink } from 'react-router-dom'
import { Brain, Network, MessageSquare, Radio, Gauge, Server, Settings, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/memories', icon: Brain, label: 'Memories' },
  { to: '/graph', icon: Network, label: 'Graph' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/feed', icon: Radio, label: 'Feed' },
  { to: '/benchmark', icon: Gauge, label: 'Benchmark' },
  { to: '/system', icon: Server, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight truncate">
            Deep Memory Explorer
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={onToggle} className="shrink-0">
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
