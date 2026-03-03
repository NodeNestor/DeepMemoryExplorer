import { useState, useCallback } from 'react'
import { ChatThread, type ChatMessage } from '@/components/chat/ChatThread'
import { ChatInput } from '@/components/chat/ChatInput'
import { streamChat } from '@/lib/api'

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  const handleSend = useCallback(
    async (message: string, mode: 'rag' | 'agent', maxIterations: number) => {
      const userMsg: ChatMessage = { role: 'user', content: message }
      setMessages((prev) => [...prev, userMsg])
      setStreaming(true)

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        sources: [],
        toolCalls: [],
        streaming: true,
      }
      setMessages((prev) => [...prev, assistantMsg])

      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      try {
        const endpoint = mode === 'agent' ? '/api/chat/agent' : '/api/chat'
        const body = {
          message,
          history,
          ...(mode === 'agent' ? { max_iterations: maxIterations } : {}),
        }

        for await (const event of streamChat(endpoint as any, body)) {
          setMessages((prev) => {
            const updated = [...prev]
            const last = { ...updated[updated.length - 1] }

            switch (event.event) {
              case 'token':
                last.content += event.data.token ?? event.data ?? ''
                break
              case 'sources':
                last.sources = event.data
                break
              case 'tool_call':
                last.toolCalls = [...(last.toolCalls ?? []), event.data]
                break
              case 'error':
                last.content += `\n\nError: ${event.data.message ?? event.data}`
                break
              case 'done':
                last.streaming = false
                break
              default:
                if (typeof event.data === 'string') {
                  last.content += event.data
                }
            }

            updated[updated.length - 1] = last
            return updated
          })
        }

        // Mark streaming complete
        setMessages((prev) => {
          const updated = [...prev]
          const last = { ...updated[updated.length - 1], streaming: false }
          updated[updated.length - 1] = last
          return updated
        })
      } catch (err: any) {
        setMessages((prev) => {
          const updated = [...prev]
          const last = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content || `Error: ${err.message}`,
            streaming: false,
          }
          updated[updated.length - 1] = last
          return updated
        })
      } finally {
        setStreaming(false)
      }
    },
    [messages]
  )

  return (
    <div className="flex flex-col h-full">
      <ChatThread messages={messages} streaming={streaming} />
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  )
}
