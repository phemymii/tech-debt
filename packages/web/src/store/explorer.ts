import { create } from 'zustand'
import type { AgeBucket, DebtKind, DebtReport } from '@tech-debt/core'

export type ViewMode = 'overview' | 'items' | 'authors' | 'files'
export type Theme = 'light' | 'dark'

export interface GitUser {
  name: string | null
  email: string | null
}

interface ExplorerState {
  report: DebtReport | null
  loading: boolean
  scanning: boolean
  selectedItemId: string | null
  viewMode: ViewMode
  searchQuery: string
  filterKind: DebtKind | 'all'
  filterAge: AgeBucket | 'all'
  filterMine: boolean
  filterAuthor: string | null
  showTriaged: boolean
  gitUser: GitUser | null
  theme: Theme

  setReport: (report: DebtReport) => void
  setLoading: (loading: boolean) => void
  setScanning: (scanning: boolean) => void
  selectItem: (id: string | null) => void
  setViewMode: (mode: ViewMode) => void
  setSearchQuery: (query: string) => void
  setFilterKind: (kind: DebtKind | 'all') => void
  setFilterAge: (age: AgeBucket | 'all') => void
  setFilterMine: (mine: boolean) => void
  setFilterAuthor: (author: string | null) => void
  setShowTriaged: (show: boolean) => void
  setGitUser: (user: GitUser | null) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const savedTheme =
  typeof localStorage !== 'undefined'
    ? (localStorage.getItem('tech-debt-theme') as Theme | null)
    : null

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  report: null,
  loading: true,
  scanning: false,
  selectedItemId: null,
  viewMode: 'overview',
  searchQuery: '',
  filterKind: 'all',
  filterAge: 'all',
  filterMine: false,
  filterAuthor: null,
  showTriaged: false,
  gitUser: null,
  theme: savedTheme ?? 'light',

  setReport: (report) => set({ report, loading: false, scanning: false }),
  setLoading: (loading) => set({ loading }),
  setScanning: (scanning) => set({ scanning }),
  selectItem: (id) => set({ selectedItemId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterKind: (kind) => set({ filterKind: kind }),
  setFilterAge: (age) => set({ filterAge: age }),
  setFilterMine: (mine) =>
    set({ filterMine: mine, filterAuthor: mine ? null : get().filterAuthor }),
  setFilterAuthor: (author) =>
    set({
      filterAuthor: author,
      filterMine: author ? false : get().filterMine,
    }),
  setShowTriaged: (showTriaged) => set({ showTriaged }),
  setGitUser: (gitUser) => set({ gitUser }),
  setTheme: (theme) => {
    localStorage.setItem('tech-debt-theme', theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('tech-debt-theme', next)
    set({ theme: next })
  },
}))
