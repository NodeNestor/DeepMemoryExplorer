import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Slider } from '@/components/ui/Slider'
import { useSettings } from '@/stores/settings'

interface ChatInputProps {
  onSend: (message: string, mode: 'rag' | 'agent', maxIterations: number) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'rag' | 'agent'>('rag')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const settings = useSettings()
  const [maxIterations, setMaxIterations] = useState(settings.agent_max_iterations)

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, mode, maxIterations)
    setMessage('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t p-4">
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            <button
              onClick={() => setMode('rag')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === 'rag' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              RAG
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === 'agent' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              Agent
            </button>
          </div>

          {mode === 'agent' && (
            <div className="w-48">
              <Slider
                label="Iterations"
                min={1}
                max={100}
                value={maxIterations}
                onValueChange={setMaxIterations}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'rag'
                ? 'Ask about your knowledge base...'
                : 'Ask the agent to research something...'
            }
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
            disabled={disabled}
          />
          <Button onClick={handleSend} disabled={disabled || !message.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
