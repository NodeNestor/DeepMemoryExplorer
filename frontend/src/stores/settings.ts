import { create } from 'zustand'
import { api, type AppConfig } from '@/lib/api'

interface SettingsState {
  hivemind_url: string
  llm_api_url: string
  llm_model: string
  llm_api_key: string
  llm_max_tokens: number
  agent_max_iterations: number
  darkMode: boolean
  setField: <K extends keyof Omit<SettingsState, 'setField' | 'syncToBackend' | 'loadFromBackend' | 'toggleDarkMode'>>(
    key: K,
    value: SettingsState[K]
  ) => void
  syncToBackend: () => Promise<void>
  loadFromBackend: () => Promise<void>
  toggleDarkMode: () => void
}

function loadPersisted(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem('dme-settings')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persist(state: Partial<SettingsState>) {
  localStorage.setItem('dme-settings', JSON.stringify(state))
}

const persisted = loadPersisted()

export const useSettings = create<SettingsState>((set, get) => ({
  hivemind_url: persisted.hivemind_url ?? 'http://localhost:8100',
  llm_api_url: persisted.llm_api_url ?? 'http://localhost:8989/v1',
  llm_model: persisted.llm_model ?? 'Qwen/Qwen3.5-0.8B',
  llm_api_key: persisted.llm_api_key ?? '',
  llm_max_tokens: persisted.llm_max_tokens ?? 16384,
  agent_max_iterations: persisted.agent_max_iterations ?? 10,
  darkMode: persisted.darkMode ?? true,

  setField: (key, value) => {
    set({ [key]: value } as any)
    const state = get()
    persist({
      hivemind_url: state.hivemind_url,
      llm_api_url: state.llm_api_url,
      llm_model: state.llm_model,
      llm_api_key: state.llm_api_key,
      llm_max_tokens: state.llm_max_tokens,
      agent_max_iterations: state.agent_max_iterations,
      darkMode: state.darkMode,
    })
  },

  syncToBackend: async () => {
    const s = get()
    await api.updateConfig({
      hivemind_url: s.hivemind_url,
      llm_api_url: s.llm_api_url,
      llm_model: s.llm_model,
      llm_api_key: s.llm_api_key,
      llm_max_tokens: s.llm_max_tokens,
      agent_max_iterations: s.agent_max_iterations,
    })
  },

  loadFromBackend: async () => {
    const config = await api.getConfig()
    set({
      hivemind_url: config.hivemind_url,
      llm_api_url: config.llm_api_url,
      llm_model: config.llm_model,
      llm_api_key: config.llm_api_key,
      llm_max_tokens: config.llm_max_tokens,
      agent_max_iterations: config.agent_max_iterations,
    })
    const state = get()
    persist({
      hivemind_url: state.hivemind_url,
      llm_api_url: state.llm_api_url,
      llm_model: state.llm_model,
      llm_api_key: state.llm_api_key,
      llm_max_tokens: state.llm_max_tokens,
      agent_max_iterations: state.agent_max_iterations,
      darkMode: state.darkMode,
    })
  },

  toggleDarkMode: () => {
    const next = !get().darkMode
    set({ darkMode: next })
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    const state = get()
    persist({
      hivemind_url: state.hivemind_url,
      llm_api_url: state.llm_api_url,
      llm_model: state.llm_model,
      llm_api_key: state.llm_api_key,
      llm_max_tokens: state.llm_max_tokens,
      agent_max_iterations: state.agent_max_iterations,
      darkMode: next,
    })
  },
}))
