export interface GEODimension {
  id: 'structure' | 'eeat' | 'technical' | 'freshness' | 'readability'
  nameKo: string
  score: number
  maxScore: number
  observations: string[]
  improvements: string[]
}

export interface GEORecommendation {
  priority: 'critical' | 'high' | 'medium'
  title: string
  description: string
  expectedImpact: string
  effort: 'low' | 'medium' | 'high'
}

export type GradeType = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
export type VisibilityLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low'

export interface GEOAnalysisResult {
  id: string
  serviceName: string
  category: string
  categoryLabel: string
  url?: string
  totalScore: number
  grade: GradeType
  gradeLabel: string
  dimensions: GEODimension[]
  summary: string
  topIssues: string[]
  recommendations: GEORecommendation[]
  industryAverage: number
  topPerformerScore: number
  citationProbability: number
  aiVisibilityLevel: VisibilityLevel
  competitiveInsight: string
  quickWins: string[]
  analyzedAt: string
}

export interface HistoryEntry {
  id: string
  serviceName: string
  category: string
  categoryLabel: string
  totalScore: number
  grade: GradeType
  analyzedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type AppView = 'landing' | 'analyzing' | 'dashboard'
