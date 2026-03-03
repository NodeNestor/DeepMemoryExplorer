import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

export function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <StatusBar />
    </div>
  )
}
