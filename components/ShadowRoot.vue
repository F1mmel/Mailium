<template>
  <div ref="host" class="shadow-root-host"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  content: string
  darkMode?: boolean
}>(), {
  darkMode: true
})

const host = ref<HTMLElement | null>(null)
let shadowRoot: ShadowRoot | null = null

// Detect if an email HTML string is natively dark
const isAlreadyDarkEmail = (html: string): boolean => {
  if (!html) return false
  const lower = html.toLowerCase()

  // 1. Has native prefers-color-scheme: dark query
  if (lower.includes('prefers-color-scheme: dark') || lower.includes('prefers-color-scheme:dark')) {
    return true
  }

  // 2. Check for explicit dark background colors in inline styles or attributes
  const darkBgPatterns = [
    /background(?:-color)?\s*:\s*#0[0-9a-f]{2,5}/i,
    /background(?:-color)?\s*:\s*#1[0-9a-f]{2,5}/i,
    /background(?:-color)?\s*:\s*#2[0-9a-f]{2,5}/i,
    /background(?:-color)?\s*:\s*black/i,
    /background(?:-color)?\s*:\s*rgb\(\s*(?:[0-9]|[1-3][0-9]|40)\s*,\s*(?:[0-9]|[1-3][0-9]|40)\s*,\s*(?:[0-9]|[1-3][0-9]|40)\s*\)/i,
    /bgcolor\s*=\s*["']?#(?:000|111|222|09090b|18181b|121212|050505|000000)["']?/i,
    /bgcolor\s*=\s*["']?black["']?/i
  ]

  for (const pattern of darkBgPatterns) {
    if (pattern.test(html)) {
      return true
    }
  }

  return false
}

const darkBaseStyles = `
  :host {
    display: block;
    width: 100%;
    overflow-x: auto;
    color-scheme: dark;
  }
  .email-body-wrapper.invert-dark {
    filter: invert(0.92) hue-rotate(180deg);
    background-color: #ffffff;
    color: #000000;
  }
  .email-body-wrapper.invert-dark img,
  .email-body-wrapper.invert-dark video,
  .email-body-wrapper.invert-dark picture,
  .email-body-wrapper.invert-dark svg {
    filter: invert(1) hue-rotate(180deg) !important;
  }
  .email-body-wrapper {
    margin: 0;
    padding: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    word-break: break-word;
    border-radius: 8px;
    padding: 12px;
  }
  .email-body-wrapper img {
    max-width: 100% !important;
    height: auto !important;
  }
`

const lightBaseStyles = `
  :host {
    display: block;
    width: 100%;
    overflow-x: auto;
    color-scheme: light;
  }
  .email-body-wrapper {
    margin: 0;
    padding: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    word-break: break-word;
    background-color: #ffffff;
    color: #000000;
    border-radius: 8px;
    padding: 12px;
  }
  .email-body-wrapper img {
    max-width: 100% !important;
    height: auto !important;
  }
`

const updateContent = () => {
  if (host.value) {
    if (!shadowRoot) {
      shadowRoot = host.value.attachShadow({ mode: 'open' })
    }

    const cssToInject = props.darkMode ? darkBaseStyles : lightBaseStyles
    const nativeDark = isAlreadyDarkEmail(props.content || '')
    const shouldInvert = props.darkMode && !nativeDark

    shadowRoot.innerHTML = `
      <style>${cssToInject}</style>
      <div class="email-body-wrapper ${shouldInvert ? 'invert-dark' : ''}">
        ${props.content || ''}
      </div>
    `
  }
}

onMounted(updateContent)
watch([() => props.content, () => props.darkMode], updateContent)
</script>

<style scoped>
.shadow-root-host {
  width: 100%;
  display: block;
  border: none;
  margin: 0;
  padding: 0;
}
</style>
