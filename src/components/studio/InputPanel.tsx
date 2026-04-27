'use client'

import { useRef, useState } from 'react'
import { Upload, X, Link2, Loader2, CheckCircle, AlertCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudioImage, StudioReference, StudioInput, ImagePurpose, ContentPurpose, ContentTone } from '@/lib/studio-types'

const IMAGE_PURPOSE_LABELS: Record<ImagePurpose, string> = {
  thumbnail: '썸네일/대표 이미지',
  inline: '본문 삽입',
  highlight: '강조/포인트',
  closing: '마무리/CTA',
}

const CONTENT_PURPOSE_OPTIONS: { value: ContentPurpose; label: string; desc: string }[] = [
  { value: 'blog', label: '📝 블로그 포스트', desc: '정보 전달 + 경험 공유' },
  { value: 'marketing', label: '📣 마케팅 콘텐츠', desc: '설득 + 전환 유도' },
  { value: 'technical', label: '⚙️ 기술 아티클', desc: '전문 지식 전달' },
  { value: 'news', label: '📰 뉴스/보도', desc: '사실 기반 보도' },
  { value: 'social', label: '📱 소셜 미디어', desc: '짧고 임팩트 있는 콘텐츠' },
]

const TONE_OPTIONS: { value: ContentTone; label: string }[] = [
  { value: 'professional', label: '전문적' },
  { value: 'friendly', label: '친근함' },
  { value: 'marketing', label: '마케팅형' },
  { value: 'casual', label: '캐주얼' },
  { value: 'academic', label: '학술적' },
]

interface InputPanelProps {
  input: StudioInput
  onChange: (update: Partial<StudioInput>) => void
  onGenerate: () => void
  generating: boolean
}

export function InputPanel({ input, onChange, onGenerate, generating }: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Image handling ───────────────────────────────────────────────────────

  function handleImageFiles(files: FileList | null) {
    if (!files) return
    const remaining = 5 - input.images.length
    const toAdd = Array.from(files).slice(0, remaining)

    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        const newImg: StudioImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          file,
          dataUrl,
          filename: file.name,
          description: '',
          purpose: 'inline',
        }
        onChange({ images: [...input.images, newImg] })
      }
      reader.readAsDataURL(file)
    })
  }

  function updateImage(id: string, update: Partial<StudioImage>) {
    onChange({ images: input.images.map(img => img.id === id ? { ...img, ...update } : img) })
  }

  function removeImage(id: string) {
    onChange({ images: input.images.filter(img => img.id !== id) })
  }

  // ── Reference handling ───────────────────────────────────────────────────

  function addReference() {
    if (input.references.length >= 5) return
    const ref: StudioReference = {
      id: `ref_${Date.now()}`,
      url: '',
      reflectionPoint: '',
    }
    onChange({ references: [...input.references, ref] })
  }

  function updateReference(id: string, update: Partial<StudioReference>) {
    onChange({ references: input.references.map(r => r.id === id ? { ...r, ...update } : r) })
  }

  function removeReference(id: string) {
    onChange({ references: input.references.filter(r => r.id !== id) })
  }

  async function fetchReference(id: string) {
    const ref = input.references.find(r => r.id === id)
    if (!ref?.url?.startsWith('http')) return
    updateReference(id, { loading: true, error: undefined })
    try {
      const res = await fetch('/api/studio/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ref.url, reflectionPoint: ref.reflectionPoint }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      updateReference(id, { loading: false, summary: data.summary, title: data.title })
    } catch (e) {
      updateReference(id, { loading: false, error: e instanceof Error ? e.message : '오류' })
    }
  }

  const isValid = input.topic.trim().length > 0

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">

      {/* Topic */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          주제 / 제목 <span className="text-red-400">*</span>
        </label>
        <textarea
          value={input.topic}
          onChange={e => onChange({ topic: e.target.value })}
          placeholder="예) GEO 최적화를 통한 AI 검색 노출 전략, 2025 마케팅 트렌드 분석..."
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
        />
      </div>

      {/* Content Purpose */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-bold text-gray-700 mb-3">콘텐츠 목적</p>
        <div className="grid grid-cols-1 gap-2">
          {CONTENT_PURPOSE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ contentPurpose: opt.value })}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                input.contentPurpose === opt.value
                  ? 'border-[#2563EB] bg-gray-50'
                  : 'border-gray-100 hover:border-gray-200'
              )}
            >
              <span className="text-base">{opt.label.split(' ')[0]}</span>
              <div>
                <p className={cn('text-xs font-semibold', input.contentPurpose === opt.value ? 'text-gray-800' : 'text-gray-700')}>
                  {opt.label.split(' ').slice(1).join(' ')}
                </p>
                <p className="text-xs text-gray-400">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-bold text-gray-700 mb-3">톤앤매너</p>
        <div className="grid grid-cols-3 gap-1.5">
          {TONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ tone: opt.value })}
              className={cn(
                'py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all',
                input.tone === opt.value
                  ? 'border-[#2563EB] bg-gray-50 text-gray-800'
                  : 'border-gray-100 text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">
            이미지 <span className="text-gray-400 font-normal">({input.images.length}/5)</span>
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={input.images.length >= 5}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <Upload size={12} />
            이미지 추가
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleImageFiles(e.target.files)}
        />

        {input.images.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-[#2563EB]/40 hover:text-gray-500 transition-colors"
          >
            <Upload size={24} />
            <span className="text-sm">클릭하거나 이미지를 끌어다 놓으세요</span>
            <span className="text-xs">최대 5개, JPG/PNG/GIF/WebP</span>
          </button>
        ) : (
          <div
            className="space-y-3"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files) }}
          >
            {input.images.map(img => (
              <div key={img.id} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                <div className="flex items-start gap-3 p-3">
                  <img src={img.dataUrl} alt={img.filename} className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border border-gray-200" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-xs text-gray-500 truncate">{img.filename}</p>
                    <input
                      type="text"
                      value={img.description}
                      onChange={e => updateImage(img.id, { description: e.target.value })}
                      placeholder="이미지 설명 (내용, 무엇을 보여주는지)"
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 bg-white"
                    />
                    <select
                      value={img.purpose}
                      onChange={e => updateImage(img.id, { purpose: e.target.value as ImagePurpose })}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30"
                    >
                      {Object.entries(IMAGE_PURPOSE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => removeImage(img.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
            {input.images.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-gray-200 rounded-xl py-3 text-xs text-gray-400 hover:border-[#2563EB]/40 hover:text-gray-500 transition-colors"
              >
                + 이미지 추가
              </button>
            )}
          </div>
        )}
      </div>

      {/* References */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">
            참고자료 <span className="text-gray-400 font-normal">({input.references.length}/5)</span>
          </p>
          <button
            onClick={addReference}
            disabled={input.references.length >= 5}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <Plus size={12} />
            URL 추가
          </button>
        </div>

        {input.references.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">참고할 블로그, 아티클, 논문 URL을 추가하세요</p>
        ) : (
          <div className="space-y-3">
            {input.references.map(ref => (
              <div key={ref.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={ref.url}
                    onChange={e => updateReference(ref.id, { url: e.target.value, summary: undefined })}
                    placeholder="https://example.com/article"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => fetchReference(ref.id)}
                    disabled={!ref.url.startsWith('http') || ref.loading}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                  >
                    {ref.loading ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                    {ref.loading ? '' : '요약'}
                  </button>
                  <button onClick={() => removeReference(ref.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={ref.reflectionPoint}
                  onChange={e => updateReference(ref.id, { reflectionPoint: e.target.value })}
                  placeholder="이 자료에서 반영하고 싶은 포인트 (선택)"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {ref.summary && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-1">
                      <CheckCircle size={11} /> {ref.title ?? '요약 완료'}
                    </p>
                    <p className="text-xs text-blue-700 leading-relaxed">{ref.summary}</p>
                  </div>
                )}
                {ref.error && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {ref.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(s => !s)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors"
        >
          고급 설정
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showAdvanced && (
          <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">플랫폼</label>
              <select
                value={input.platform}
                onChange={e => onChange({ platform: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30"
              >
                <option value="naver_blog">🟢 네이버 블로그</option>
                <option value="tistory">🟠 티스토리</option>
                <option value="velog">🔵 벨로그</option>
                <option value="website">🏢 웹사이트</option>
                <option value="medium">⚫ 미디엄</option>
                <option value="notion">📓 노션</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">타겟 독자</label>
              <input
                type="text"
                value={input.targetAudience}
                onChange={e => onChange({ targetAudience: e.target.value })}
                placeholder="예) 마케터, 스타트업 창업자, 개발자..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">추가 요구사항</label>
              <textarea
                value={input.additionalNotes}
                onChange={e => onChange({ additionalNotes: e.target.value })}
                placeholder="특별히 포함하거나 강조하고 싶은 내용..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={!isValid || generating}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 py-4 rounded-lg font-bold text-base transition-all sticky bottom-0',
          isValid && !generating
            ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        )}
      >
        {generating ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            AI 콘텐츠 생성 중...
          </>
        ) : (
          <>
            ✨ 콘텐츠 생성하기
          </>
        )}
      </button>
    </div>
  )
}
