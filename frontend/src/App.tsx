import { Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { MemoriesPage } from '@/pages/MemoriesPage'
import { GraphPage } from '@/pages/GraphPage'
import { ChatPage } from '@/pages/ChatPage'
import { FeedPage } from '@/pages/FeedPage'
import { BenchmarkPage } from '@/pages/BenchmarkPage'
import { SystemPage } from '@/pages/SystemPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/memories" element={<MemoriesPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
        <Route path="/system" element={<SystemPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/memories" replace />} />
      </Routes>
    </Shell>
  )
}
