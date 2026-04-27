'use client'

import { useState, useEffect } from 'react'
import { LandingScreen } from '@/components/LandingScreen'
import { AnalyzingScreen } from '@/components/AnalyzingScreen'
import { DashboardScreen } from '@/components/DashboardScreen'
import { AIAgentChat } from '@/components/AIAgentChat'
import { saveToHistory, getPreviousScore } from '@/lib/utils'
import type { GEOAnalysisResult, AppView } from '@/lib/types'
import type { CombinedAnalysisResult } from '@/app/api/analyze/combined/route'

export default function Home() {
  const [view, setView] = useState<AppView>('landing')
  const [analysis, setAnalysis] = useState<GEOAnalysisResult | null>(null)
  const [combined, setCombined] = useState<CombinedAnalysisResult | null>(null)
  const [pendingInput, setPendingInput] = useState<{ name: string; category: string; url?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatMessage, setChatMessage] = useState<string | undefined>(undefined)
  const [chatForceOpen, setChatForceOpen] = useState(false)
  const [previousScore, setPreviousScore] = useState<number | null>(null)

  // Resume last session
  useEffect(() => {
    try {
      const savedCombined = sessionStorage.getItem('geo_combined')
      if (savedCombined) {
        const parsed: CombinedAnalysisResult = JSON.parse(savedCombined)
        setCombined(parsed)
        setAnalysis(parsed.geoAnalysis)
        setView('dashboard')
        return
      }
      const saved = sessionStorage.getItem('geo_current')
      if (saved) {
        const parsed: GEOAnalysisResult = JSON.parse(saved)
        setAnalysis(parsed)
        setView('dashboard')
      }
    } catch {
      sessionStorage.removeItem('geo_combined')
      sessionStorage.removeItem('geo_current')
    }
  }, [])

  async function handleAnalyze(serviceName: string, category: string, url?: string) {
    setPendingInput({ name: serviceName, category, url })
    setView('analyzing')
    setError(null)
    setCombined(null)

    const prevScore = getPreviousScore(serviceName, category)
    setPreviousScore(prevScore)

    try {
      // ── Use combined endpoint (GEO + Citation in parallel) ──────────────────
      const res = await fetch('/api/analyze/combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, category, url, previousScore: prevScore }),
      })
      const data: CombinedAnalysisResult = await res.json()

      if (!res.ok) {
        setError((data as { error?: string }).error ?? '분석에 실패했습니다.')
        setView('landing')
        return
      }

      // Save both combined and individual GEO result
      saveToHistory(data.geoAnalysis)
      sessionStorage.setItem('geo_combined', JSON.stringify(data))
      sessionStorage.setItem('geo_current', JSON.stringify(data.geoAnalysis))

      setCombined(data)
      setAnalysis(data.geoAnalysis)
      setView('dashboard')
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setView('landing')
    }
  }

  function handleReanalyze() {
    const input = pendingInput ?? (analysis ? { name: analysis.serviceName, category: analysis.category, url: analysis.url } : null)
    if (input) handleAnalyze(input.name, input.category, input.url)
  }

  function handleBack() {
    sessionStorage.removeItem('geo_combined')
    sessionStorage.removeItem('geo_current')
    setAnalysis(null)
    setCombined(null)
    setView('landing')
    setError(null)
  }

  function handleOpenChat(message?: string) {
    setChatForceOpen(true)
    setChatMessage(message)
  }

  return (
    <>
      {view === 'landing' && (
        <LandingScreen onAnalyze={handleAnalyze} isLoading={false} />
      )}

      {view === 'analyzing' && pendingInput && (
        <AnalyzingScreen serviceName={pendingInput.name} category={pendingInput.category} />
      )}

      {view === 'dashboard' && analysis && (
        <>
          <DashboardScreen
            analysis={analysis}
            combined={combined}
            previousScore={previousScore}
            onBack={handleBack}
            onReanalyze={handleReanalyze}
            onOpenChat={handleOpenChat}
          />
          <AIAgentChat
            analysis={analysis}
            forceOpen={chatForceOpen}
            onForceOpenHandled={() => setChatForceOpen(false)}
            initialMessage={chatMessage}
            onClearInitialMessage={() => setChatMessage(undefined)}
          />
        </>
      )}

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-5 py-3 rounded-xl max-w-sm text-center">
          {error}
          <button onClick={() => setError(null)} className="ml-3 underline text-red-200 hover:text-white">닫기</button>
        </div>
      )}
    </>
  )
}
