import { useState } from 'react'
import { Loader2, Sparkles, AlertTriangle, Link2, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { api } from '@/lib/api'

interface AnalysisPanelProps {
  selectedIds: number[]
}

export function AnalysisPanel({ selectedIds }: AnalysisPanelProps) {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')

  const disabled = selectedIds.length === 0

  const runAnalysis = async (fn: () => Promise<{ result: string }>) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await fn()
      setResult(data.result)
    } catch (err: any) {
      setError(err.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Analysis {selectedIds.length > 0 && `(${selectedIds.length} selected)`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            onClick={() => runAnalysis(() => api.summarize(selectedIds))}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Summarize
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            onClick={() => runAnalysis(() => api.contradictions(selectedIds))}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Contradictions
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            onClick={() => runAnalysis(() => api.explain(selectedIds))}
          >
            <Link2 className="h-3 w-3 mr-1" />
            Explain Connections
          </Button>
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Custom analysis prompt..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[40px] text-sm"
            rows={2}
          />
          <Button
            variant="outline"
            size="icon"
            disabled={disabled || loading || !customPrompt.trim()}
            onClick={() =>
              runAnalysis(() => api.customAnalysis(selectedIds, customPrompt))
            }
          >
            <Play className="h-3 w-3" />
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running analysis...
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {result && (
          <ScrollArea maxHeight="200px">
            <div className="bg-muted rounded p-3 text-sm whitespace-pre-wrap">{result}</div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
