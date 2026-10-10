import { create } from 'zustand'

interface AppState {
  selectedTechniqueId: string | null
  activeTactic: string | null
  coverageFilter: string | null
  isCommandPaletteOpen: boolean
  demoLoaded: boolean
  corpusId: string | null
  attackVersion: string | null
  ruleCount: number
  setSelectedTechnique: (id: string | null) => void
  setActiveTactic: (tactic: string | null) => void
  setCoverageFilter: (level: string | null) => void
  setCommandPaletteOpen: (open: boolean) => void
  setDemoLoaded: (loaded: boolean) => void
  setCorpusId: (id: string | null) => void
  setAttackVersion: (version: string | null) => void
  setRuleCount: (count: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedTechniqueId: null,
  activeTactic: null,
  coverageFilter: null,
  isCommandPaletteOpen: false,
  demoLoaded: false,
  corpusId: null,
  attackVersion: null,
  ruleCount: 0,

  setSelectedTechnique: (id) => set({ selectedTechniqueId: id }),
  setActiveTactic: (tactic) => set({ activeTactic: tactic }),
  setCoverageFilter: (level) => set({ coverageFilter: level }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setDemoLoaded: (loaded) => set({ demoLoaded: loaded }),
  setCorpusId: (id) => set({ corpusId: id }),
  setAttackVersion: (version) => set({ attackVersion: version }),
  setRuleCount: (count) => set({ ruleCount: count }),
}))
