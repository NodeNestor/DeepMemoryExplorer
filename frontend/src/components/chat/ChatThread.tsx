import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Badge } from '@/components/ui/Badge'
import { SourceCitations } from './SourceCitations'
import type { SearchHit } from '@/lib/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: SearchHit[]
  toolCalls?: Array<{ tool: string; args: string; result: string }>
  streaming?: boolean
}

interface ChatThreadProps {
  messages: ChatMessage[]
  streaming: boolean
}

export function ChatThread({ messages, streaming }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">
              Ask questions about your knowledge base. Use RAG mode for simple queries
              or Agent mode for multi-step research.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                <ToolCallsSection toolCalls={msg.toolCalls} />
              )}

              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {msg.role === 'assistant' && msg.streaming && (
                <Loader2 className="h-4 w-4 animate-spin mt-2 text-muted-foreground" />
              )}

              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <SourceCitations sources={msg.sources} />
                </div>
              )}
            </div>
          </div>
        ))}

        {streaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

function ToolCallsSection({
  toolCalls,
}: {
  toolCalls: Array<{ tool: string; args: string; result: string }>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Research Steps ({toolCalls.length})
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {toolCalls.map((call, i) => (
            <div key={i} className="bg-background/50 rounded px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {call.tool}
                </Badge>
                <span className="text-muted-foreground truncate">{call.args}</span>
              </div>
              {call.result && (
                <p className="text-muted-foreground mt-1 line-clamp-2">{call.result}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
