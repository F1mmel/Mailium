import { ref } from 'vue'

export interface FontOption {
  id: string
  name: string
  family: string
  description: string
}

export interface FontSizeOption {
  id: string
  name: string
  sizePx: number
  description: string
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", description: 'Default' },
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif", description: 'Geometric Sans' },
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", description: 'Modern Tech' },
  { id: 'geist', name: 'Geist', family: "'Geist', sans-serif", description: 'Vercel Sans' },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif", description: 'Clean Geometric' },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif", description: 'Modern Sans' },
  { id: 'urbanist', name: 'Urbanist', family: "'Urbanist', sans-serif", description: 'Sleek Low-Contrast' },
  { id: 'sora', name: 'Sora', family: "'Sora', sans-serif", description: 'Futuristic Tech' },
  { id: 'space-grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", description: 'Neo-Grotesque' },
  { id: 'syne', name: 'Syne', family: "'Syne', sans-serif", description: 'Artistic Expressive' },
  { id: 'open-sans', name: 'Open Sans', family: "'Open Sans', sans-serif", description: 'Humanist Sans' },
  { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif", description: 'Classic Clean' },
  { id: 'lato', name: 'Lato', family: "'Lato', sans-serif", description: 'Friendly Warm' },
  { id: 'fira-code', name: 'Fira Code', family: "'Fira Code', monospace", description: 'Monospace Code' },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", description: 'Developer Mono' },
  { id: 'lora', name: 'Lora', family: "'Lora', serif", description: 'Elegant Serif' },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", description: 'Editorial Serif' }
]

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { id: 'sm', name: 'Small', sizePx: 13.5, description: 'Compact (-10%)' },
  { id: 'md', name: 'Normal', sizePx: 15, description: 'Default (100%)' },
  { id: 'lg', name: 'Large', sizePx: 16.5, description: 'Comfortable (+10%)' },
  { id: 'xl', name: 'Extra Large', sizePx: 18, description: 'Maximum Legibility (+20%)' },
]

// Hydrate initial font state synchronously from localStorage
let initialFont = 'inter'
let initialSizePx = 15
if (import.meta.client) {
  try {
    const savedFont = localStorage.getItem('mailium_ui_font')
    if (savedFont) initialFont = savedFont
    const savedSize = parseFloat(localStorage.getItem('mailium_ui_font_size_px') || '15')
    if (!isNaN(savedSize)) initialSizePx = savedSize
  } catch (e) {
    // LocalStorage parse fallback
  }
}

const currentFontId = ref<string>(initialFont)
const currentFontSizePx = ref<number>(initialSizePx)

const applyStyles = () => {
  if (!import.meta.client) return
  const foundFont = FONT_OPTIONS.find(f => f.id === currentFontId.value) || FONT_OPTIONS[0]

  let styleEl = document.getElementById('dynamic-ui-font')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dynamic-ui-font'
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = `
    :root {
      --app-active-font: ${foundFont.family};
    }
    body, button, input, select, textarea, p, span, div, h1, h2, h3, h4, h5, h6, a {
      font-family: var(--app-active-font);
    }
    html {
      font-size: ${currentFontSizePx.value}px !important;
    }
  `
}

// Immediately apply font & size styles on script evaluation
if (import.meta.client) {
  applyStyles()
}

export function useFont() {
  const setFont = (fontId: string) => {
    currentFontId.value = fontId
    if (import.meta.client) {
      localStorage.setItem('mailium_ui_font', fontId)
      applyStyles()
    }
  }

  const setFontSizePx = (px: number) => {
    currentFontSizePx.value = px
    if (import.meta.client) {
      localStorage.setItem('mailium_ui_font_size_px', px.toString())
      applyStyles()
    }
  }

  const initFont = () => {
    if (import.meta.client) {
      const savedFont = localStorage.getItem('mailium_ui_font') || 'inter'
      const savedSize = parseFloat(localStorage.getItem('mailium_ui_font_size_px') || '15')
      currentFontId.value = savedFont
      currentFontSizePx.value = isNaN(savedSize) ? 15 : savedSize
      applyStyles()
    }
  }

  return {
    currentFontId,
    currentFontSizePx,
    FONT_OPTIONS,
    FONT_SIZE_OPTIONS,
    setFont,
    setFontSizePx,
    initFont
  }
}
