import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { GRADE_CONFIG } from './constants'
import type { GradeType, VisibilityLevel, GEOAnalysisResult, HistoryEntry } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGrade(score: number): GradeType {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

export function getGradeConfig(grade: GradeType) {
  return GRADE_CONFIG[grade]
}

export function getVisibilityLevel(score: number): VisibilityLevel {
  if (score >= 85) return 'very_high'
  if (score >= 70) return 'high'
  if (score >= 55) return 'medium'
  if (score >= 40) return 'low'
  return 'very_low'
}

export const VISIBILITY_LABELS: Record<VisibilityLevel, string> = {
  very_high: '매우 높음',
  high: '높음',
  medium: '보통',
  low: '낮음',
  very_low: '매우 낮음',
}

export function getScoreColor(pct: number): string {
  if (pct >= 75) return '#059669'
  if (pct >= 50) return '#2563EB'
  if (pct >= 30) return '#D97706'
  return '#DC2626'
}

export function getScoreLabel(pct: number): string {
  if (pct >= 75) return '우수'
  if (pct >= 50) return '보통'
  if (pct >= 30) return '미흡'
  return '불량'
}

export function getPriorityConfig(priority: string) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: '긴급', color: '#DC2626', bg: '#FEF2F2' },
    high: { label: '높음', color: '#EA580C', bg: '#FFF7ED' },
    medium: { label: '보통', color: '#D97706', bg: '#FFFBEB' },
  }
  return configs[priority] ?? configs.medium
}

export function getEffortLabel(effort: string): string {
  const labels: Record<string, string> = { low: '쉬움', medium: '보통', high: '어려움' }
  return labels[effort] ?? effort
}

const HISTORY_KEY = 'geo_analysis_history'

export function saveToHistory(result: GEOAnalysisResult) {
  if (typeof window === 'undefined') return
  try {
    const existing = getHistory()
    const entry: HistoryEntry = {
      id: result.id,
      serviceName: result.serviceName,
      category: result.category,
      categoryLabel: result.categoryLabel,
      totalScore: result.totalScore,
      grade: result.grade,
      analyzedAt: result.analyzedAt,
    }
    const updated = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, 20)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))

    const fullKey = `geo_full_${result.id}`
    localStorage.setItem(fullKey, JSON.stringify(result))
  } catch {
    // ignore storage errors
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getFullAnalysis(id: string): GEOAnalysisResult | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`geo_full_${id}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getPreviousScore(serviceName: string, category: string): number | null {
  const history = getHistory()
  const prev = history.find(
    h => h.serviceName.toLowerCase() === serviceName.toLowerCase() && h.category === category
  )
  return prev?.totalScore ?? null
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
