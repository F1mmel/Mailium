import { ref, watch } from 'vue'

export interface CustomizationSettings {
  appName: string
  accentColor: string
  density: 'comfortable' | 'compact'
  dateFormat: 'relative' | 'absolute'
}

const defaultSettings: CustomizationSettings = {
  appName: 'Mailium',
  accentColor: '#6366f1',
  density: 'comfortable',
  dateFormat: 'relative'
}

// Hydrate initial state synchronously from localStorage to eliminate FOUC (flash of unstyled content)
let initialSettings = { ...defaultSettings }
if (import.meta.client) {
  try {
    const raw = localStorage.getItem('mailium_customization_cache')
    if (raw) {
      initialSettings = { ...defaultSettings, ...JSON.parse(raw) }
    }
  } catch (e) {
    // LocalStorage parse error fallback
  }
}

const customization = ref<CustomizationSettings>(initialSettings)
const isLoaded = ref(false)

const applyAccentColor = (color: string) => {
  if (!import.meta.client) return
  const root = document.documentElement
  root.style.setProperty('--primary-accent', color)

  let styleEl = document.getElementById('dynamic-accent-style')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'dynamic-accent-style'
    document.head.appendChild(styleEl)
  }

  const alpha20 = color + '33' // 20% opacity
  const alpha40 = color + '66' // 40% opacity

  styleEl.innerHTML = `
    :root {
      --primary: ${color} !important;
      --primary-accent: ${color} !important;
    }
    
    /* Solid Backgrounds & Toggles */
    .bg-indigo-600, .bg-indigo-500, .peer-checked\\:bg-indigo-600 {
      background-color: ${color} !important;
    }
    
    /* Transparent Backgrounds & Highlights */
    .bg-indigo-600\\/20, .bg-indigo-500\\/20, .bg-indigo-600\\/15, .bg-indigo-600\\/30, .bg-indigo-600\\/40, .bg-indigo-500\\/10, .bg-indigo-500\\/15 {
      background-color: ${alpha20} !important;
    }
    .hover\\:bg-indigo-600\\/30:hover, .hover\\:bg-indigo-600\\/20:hover, .hover\\:bg-indigo-500\\/20:hover {
      background-color: ${alpha20} !important;
    }

    /* Text Colors */
    .text-indigo-400, .text-indigo-300, .text-indigo-500, .text-indigo-200 {
      color: ${color} !important;
    }
    .hover\\:text-indigo-300:hover, .hover\\:text-indigo-400:hover, .group-hover\\:text-indigo-400:hover {
      color: ${color} !important;
    }

    /* Left Border Highlights ONLY (Strictly Left Side) */
    .border-l-indigo-500, .hover\\:border-l-indigo-500\\/40:hover, .hover\\:border-l-indigo-500:hover {
      border-left-color: ${color} !important;
    }

    /* General 4-Side Borders */
    .border-indigo-500, .border-indigo-600, .border-indigo-400 {
      border-color: ${color} !important;
    }
    .focus\\:border-indigo-500:focus, .focus-within\\:border-indigo-500:focus-within {
      border-color: ${color} !important;
    }
    .border-indigo-500\\/30, .border-indigo-500\\/50, .border-indigo-500\\/40, .border-indigo-500\\/20 {
      border-color: ${alpha40} !important;
    }
    .hover\\:border-indigo-500\\/40:hover, .hover\\:border-indigo-500\\/50:hover, .hover\\:border-indigo-500:hover {
      border-color: ${alpha40} !important;
    }

    /* Rings & Shadows */
    .ring-indigo-500, .focus\\:ring-indigo-500:focus, .peer-focus\\:ring-indigo-500:focus {
      --tw-ring-color: ${color} !important;
    }
    .shadow-indigo-600\\/20, .shadow-indigo-500\\/20, .shadow-indigo-500\\/10, .shadow-indigo-600\\/10 {
      --tw-shadow-color: ${alpha20} !important;
    }
  `
}

// Immediate synchronous application on script load
if (import.meta.client) {
  applyAccentColor(customization.value.accentColor)
}

export const useCustomization = () => {
  const fetchCustomization = async () => {
    if (!import.meta.client) return
    try {
      const data: any = await $fetch('/api/settings/customization')
      if (data) {
        customization.value = {
          appName: data.appName || defaultSettings.appName,
          accentColor: data.accentColor || defaultSettings.accentColor,
          density: data.density || defaultSettings.density,
          dateFormat: data.dateFormat || defaultSettings.dateFormat
        }
        applyAccentColor(customization.value.accentColor)
        localStorage.setItem('mailium_customization_cache', JSON.stringify(customization.value))
      }
      isLoaded.value = true
    } catch (e) {
      console.error('Failed to fetch customization settings:', e)
    } finally {
      isLoaded.value = true
    }
  }

  const saveCustomization = async (newSettings: Partial<CustomizationSettings>) => {
    if (!import.meta.client) return
    customization.value = { ...customization.value, ...newSettings }
    applyAccentColor(customization.value.accentColor)
    localStorage.setItem('mailium_customization_cache', JSON.stringify(customization.value))

    try {
      await $fetch('/api/settings/customization', {
        method: 'PUT',
        body: customization.value
      })
    } catch (e) {
      console.error('Failed to save customization:', e)
      throw e
    }
  }

  if (import.meta.client) {
    watch(() => customization.value.accentColor, (newColor) => {
      if (newColor) applyAccentColor(newColor)
    }, { immediate: true })
  }

  return {
    customization,
    isLoaded,
    fetchCustomization,
    saveCustomization,
    applyAccentColor
  }
}
