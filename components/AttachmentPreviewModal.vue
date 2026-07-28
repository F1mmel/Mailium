<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'

const props = defineProps<{
  isOpen: boolean
  accountId?: string
  folder?: string
  uid?: string
  attachment?: {
    filename: string
    contentType?: string
    size?: number
    index?: number
  } | null
}>()

const emits = defineEmits<{
  (e: 'close'): void
}>()

const textContent = ref<string>('')
const isLoadingText = ref<boolean>(false)

const previewUrl = computed(() => {
  if (!props.accountId || !props.uid || !props.attachment) return ''
  const params = new URLSearchParams({
    accountId: props.accountId,
    folder: props.folder || 'INBOX',
    uid: props.uid,
    filename: props.attachment.filename || '',
    inline: 'true'
  })
  if (props.attachment.index !== undefined) {
    params.set('index', props.attachment.index.toString())
  }
  return `/api/email/download?${params.toString()}`
})

const downloadUrl = computed(() => {
  if (!props.accountId || !props.uid || !props.attachment) return ''
  const params = new URLSearchParams({
    accountId: props.accountId,
    folder: props.folder || 'INBOX',
    uid: props.uid,
    filename: props.attachment.filename || '',
    inline: 'false'
  })
  if (props.attachment.index !== undefined) {
    params.set('index', props.attachment.index.toString())
  }
  return `/api/email/download?${params.toString()}`
})

const isImage = computed(() => {
  if (!props.attachment) return false
  const fn = props.attachment.filename.toLowerCase()
  const ct = props.attachment.contentType?.toLowerCase() || ''
  return ct.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|heic|heif)$/i.test(fn)
})

const isVideo = computed(() => {
  if (!props.attachment) return false
  const fn = props.attachment.filename.toLowerCase()
  const ct = props.attachment.contentType?.toLowerCase() || ''
  return ct.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(fn)
})

const isAudio = computed(() => {
  if (!props.attachment) return false
  const fn = props.attachment.filename.toLowerCase()
  const ct = props.attachment.contentType?.toLowerCase() || ''
  return ct.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(fn)
})

const isPdf = computed(() => {
  if (!props.attachment) return false
  const fn = props.attachment.filename.toLowerCase()
  const ct = props.attachment.contentType?.toLowerCase() || ''
  return ct === 'application/pdf' || fn.endsWith('.pdf')
})

const isPlainText = computed(() => {
  if (!props.attachment) return false
  const fn = props.attachment.filename.toLowerCase()
  const ct = props.attachment.contentType?.toLowerCase() || ''
  return ct.startsWith('text/') || /\.(txt|json|csv|log|md|js|ts|html|css)$/i.test(fn)
})

// Fetch text content for text files to style with dark mode font
watch(() => [props.isOpen, props.attachment], async () => {
  if (props.isOpen && isPlainText.value && previewUrl.value) {
    isLoadingText.value = true
    textContent.value = ''
    try {
      const res = await fetch(previewUrl.value)
      textContent.value = await res.text()
    } catch (e) {
      textContent.value = 'Failed to load text preview.'
    } finally {
      isLoadingText.value = false
    }
  }
}, { immediate: true })

const triggerDownload = () => {
  if (!downloadUrl.value) return
  const a = document.createElement('a')
  a.href = downloadUrl.value
  a.download = props.attachment?.filename || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="isOpen && attachment"
      @click.self="$emit('close')"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer select-none"
    >
      <Card @click.stop class="max-w-4xl w-full max-h-[90vh] border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden flex flex-col cursor-default">
        <!-- Modal Header -->
        <div class="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 shrink-0">
          <div class="flex items-center gap-3 truncate pr-4">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Icon v-if="isImage" name="lucide:image" class="w-4 h-4" />
              <Icon v-else-if="isVideo" name="lucide:video" class="w-4 h-4" />
              <Icon v-else-if="isAudio" name="lucide:music" class="w-4 h-4" />
              <Icon v-else-if="isPdf || isPlainText" name="lucide:file-text" class="w-4 h-4" />
              <Icon v-else name="lucide:paperclip" class="w-4 h-4" />
            </div>
            <div class="truncate">
              <h3 class="font-bold text-sm text-white truncate">{{ attachment.filename }}</h3>
              <p v-if="attachment.size" class="text-[10px] text-zinc-400 font-mono">
                {{ Math.round(attachment.size / 1024) }} KB
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <Button size="sm" @click="triggerDownload" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Icon name="lucide:download" class="w-4 h-4 mr-1.5" />
              <span>Download</span>
            </Button>

            <button @click="$emit('close')" class="text-zinc-400 hover:text-white p-1 cursor-pointer">
              <Icon name="lucide:x" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950 min-h-[300px]">
          <!-- Image Preview -->
          <img
            v-if="isImage"
            :src="previewUrl"
            :alt="attachment.filename"
            class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg border border-zinc-800"
          />

          <!-- Video Preview -->
          <video
            v-else-if="isVideo"
            :src="previewUrl"
            controls
            autoplay
            class="max-w-full max-h-[70vh] rounded-lg shadow-lg border border-zinc-800"
          ></video>

          <!-- Audio Preview -->
          <div v-else-if="isAudio" class="p-8 flex flex-col items-center gap-4 text-center">
            <Icon name="lucide:disc" class="w-16 h-16 text-indigo-400 animate-spin" style="animation-duration: 6s;" />
            <audio :src="previewUrl" controls autoplay class="w-72"></audio>
          </div>

          <!-- Plain Text / Log / JSON Preview (Dark Mode Monospace) -->
          <div v-else-if="isPlainText" class="w-full h-[70vh] rounded-lg border border-zinc-800 bg-zinc-950 p-4 overflow-auto">
            <div v-if="isLoadingText" class="flex items-center justify-center h-full text-xs text-zinc-500 gap-2">
              <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading text preview...</span>
            </div>
            <pre v-else class="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed select-text">{{ textContent }}</pre>
          </div>

          <!-- PDF Preview -->
          <iframe
            v-else-if="isPdf"
            :src="previewUrl"
            class="w-full h-[70vh] rounded-lg border border-zinc-800 bg-zinc-950"
          ></iframe>
        </div>
      </Card>
    </div>
  </Transition>
</template>
