<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  name?: string
  address?: string
  isSelected?: boolean
}>()

const imgError = ref(false)

// Reset imgError whenever address changes
watch(() => props.address, () => {
  imgError.value = false
})

const initials = computed(() => {
  const text = props.name || props.address || '?'
  const cleanText = text.trim()

  // If text is an email address without a separate name
  if (cleanText.includes('@') && (!props.name || props.name === props.address)) {
    const userPart = cleanText.split('@')[0]
    const parts = userPart.split(/[._-]+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return userPart.substring(0, 2).toUpperCase()
  }

  // Name with multiple words
  const parts = cleanText.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return cleanText.substring(0, 2).toUpperCase()
})

const domain = computed(() => {
  if (!props.address || !props.address.includes('@')) return ''
  return props.address.split('@')[1].toLowerCase()
})

const faviconUrl = computed(() => {
  if (!domain.value) return ''
  return `https://www.google.com/s2/favicons?domain=${domain.value}&sz=64`
})

const handleImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  // Google's default fallback globe icon is 16x16px, real favicons are 64x64px
  if (img.naturalWidth <= 16 || img.naturalHeight <= 16) {
    imgError.value = true
  }
}

const avatarGradient = computed(() => {
  const str = props.address || props.name || 'default'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const gradients = [
    'from-indigo-600 to-purple-600',
    'from-blue-600 to-cyan-600',
    'from-emerald-600 to-teal-600',
    'from-rose-600 to-pink-600',
    'from-amber-600 to-orange-600',
    'from-violet-600 to-fuchsia-600'
  ]
  return gradients[Math.abs(hash) % gradients.length]
})
</script>

<template>
  <div class="relative w-8 h-8 rounded-full shrink-0 select-none overflow-hidden group">
    <!-- Selected Checkmark Overlay -->
    <div
      v-if="isSelected"
      class="absolute inset-0 z-10 bg-indigo-600 text-white flex items-center justify-center rounded-full transition-transform duration-200 scale-100"
    >
      <Icon name="lucide:check" class="w-4 h-4 stroke-[3]" />
    </div>

    <!-- Favicon / Domain Logo -->
    <img
      v-if="faviconUrl && !imgError"
      :src="faviconUrl"
      @load="handleImageLoad"
      @error="imgError = true"
      alt="avatar"
      class="w-full h-full object-cover rounded-full bg-zinc-800 p-1"
    />

    <!-- Fallback Initials Badge (Gradient with 2-letter Initials) -->
    <div
      v-else
      :class="[
        'w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center text-[11px] font-extrabold text-white tracking-wider uppercase shadow-inner',
        avatarGradient
      ]"
    >
      {{ initials }}
    </div>
  </div>
</template>
