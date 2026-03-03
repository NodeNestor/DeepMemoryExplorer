import { useState, useEffect } from 'react'
import { Check, X, Loader2, Sun, Moon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useSettings } from '@/stores/settings'
import { api } from '@/lib/api'

export function SettingsPage() {
  const settings = useSettings()
  const [hivemindTest, setHivemindTest] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [llmTest, setLlmTest] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load settings from backend on mount so UI matches server state
  useEffect(() => {
    settings.loadFromBackend().finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const testHivemind = async () => {
    setHivemindTest('loading')
    try {
      const health = await api.getHealth()
      setHivemindTest(health.hivemind === 'ok' ? 'ok' : 'error')
    } catch {
      setHivemindTest('error')
    }
  }

  const testLlm = async () => {
    setLlmTest('loading')
    try {
      const health = await api.getHealth()
      setLlmTest(health.llm === 'ok' ? 'ok' : 'error')
    } catch {
      setLlmTest('error')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await settings.syncToBackend()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const StatusIcon = ({ status }: { status: 'idle' | 'loading' | 'ok' | 'error' }) => {
    if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    if (status === 'ok') return <Check className="h-4 w-4 text-green-500" />
    if (status === 'error') return <X className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">HiveMindDB</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={settings.hivemind_url}
              onChange={(e) => settings.setField('hivemind_url', e.target.value)}
              placeholder="http://localhost:8100"
            />
            <Button variant="outline" size="sm" onClick={testHivemind}>
              <StatusIcon status={hivemindTest} />
              {hivemindTest === 'idle' && 'Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">LLM Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API URL</label>
            <div className="flex gap-2">
              <Input
                value={settings.llm_api_url}
                onChange={(e) => settings.setField('llm_api_url', e.target.value)}
                placeholder="http://localhost:8989/v1"
              />
              <Button variant="outline" size="sm" onClick={testLlm}>
                <StatusIcon status={llmTest} />
                {llmTest === 'idle' && 'Test'}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Model</label>
            <Input
              value={settings.llm_model}
              onChange={(e) => settings.setField('llm_model', e.target.value)}
              placeholder="Qwen/Qwen3.5-0.8B"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
            <Input
              type="password"
              value={settings.llm_api_key}
              onChange={(e) => settings.setField('llm_api_key', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Tokens</label>
            <Slider
              min={256}
              max={32768}
              step={256}
              value={settings.llm_max_tokens}
              onValueChange={(v) => settings.setField('llm_max_tokens', v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Iterations</label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={settings.agent_max_iterations}
              onChange={(e) => settings.setField('agent_max_iterations', parseInt(e.target.value) || 10)}
              className="w-32"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Maximum number of tool-call iterations per agent request.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={settings.toggleDarkMode}>
            {settings.darkMode ? (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Switch to Dark Mode
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Settings
      </Button>
    </div>
  )
}
