export type ImagePurpose = 'thumbnail' | 'inline' | 'highlight' | 'closing'
export type ContentPurpose = 'blog' | 'marketing' | 'technical' | 'news' | 'social'
export type ContentTone = 'professional' | 'friendly' | 'marketing' | 'casual' | 'academic'

export interface StudioImage {
  id: string
  file?: File
  dataUrl: string        // base64 preview + API payload
  filename: string
  description: string
  purpose: ImagePurpose
  aiCaption?: string     // GPT-4o generated
  altText?: string       // GPT-4o generated
}

export interface StudioReference {
  id: string
  url: string
  reflectionPoint: string   // what the user wants to extract
  summary?: string          // fetched by API
  title?: string
  loading?: boolean
  error?: string
}

export interface StudioInput {
  topic: string
  contentPurpose: ContentPurpose
  tone: ContentTone
  targetAudience: string
  platform: string          // naver_blog | tistory | velog | website | etc
  images: StudioImage[]
  references: StudioReference[]
  additionalNotes: string
}

// Generated content structure
export interface ContentImage {
  imageId: string    // maps back to StudioImage.id
  caption: string
  altText: string
  position: 'before' | 'after' | 'inline'
}

export interface ContentSection {
  id: string
  heading: string
  level: 1 | 2 | 3
  content: string           // markdown text
  images: ContentImage[]
  referenceIds: string[]    // which references were used
}

export interface GeneratedContent {
  title: string
  metaDescription: string
  summary: string           // 2-3 sentence summary / answer capsule
  sections: ContentSection[]
  references: Array<{
    id: string
    url: string
    title: string
    summary: string
    usedInSections: string[]
  }>
  tags: string[]
  estimatedReadTime: string
  geoOptimizations: string[]
}

// Studio pipeline events (NDJSON streaming)
export interface StudioEvent {
  type: 'step' | 'image_analyzed' | 'reference_fetched' | 'structure_ready' | 'content_ready' | 'complete' | 'error'
  message?: string
  imageId?: string
  refId?: string
  data?: GeneratedContent
  error?: string
}
