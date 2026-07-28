<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import ShadowRoot from '~/components/ShadowRoot.vue'
import ContextMenu from '~/components/ContextMenu.vue'
import EmailAvatar from '~/components/EmailAvatar.vue'
import AttachmentPreviewModal from '~/components/AttachmentPreviewModal.vue'
import ThemeSwitcher from '~/components/ThemeSwitcher.vue'

const props = defineProps<{
  accountId: string | null
  folderPath: string
  initialMessageId?: string
}>()

const emits = defineEmits<{
  (e: 'reply-mail', data: { to: string; subject: string }): void
  (e: 'forward-mail', data: { subject: string }): void
  (e: 'select-message', messageId: string | null): void
}>()

const colorMode = useColorMode()
const { isSyncing, syncAccount, lastSyncTimestamp, clientMessagesCache } = useEmail()
const { customization, fetchCustomization } = useCustomization()
const toast = useToast()

const messages = ref<any[]>([])
const totalMessages = ref(0)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedMessageId = ref<string | null>(props.initialMessageId || null)
const selectedMessageDetail = ref<any | null>(null)
const isLoadingDetail = ref(false)
const isEmailDarkMode = ref(colorMode.value !== 'light')

watch(() => colorMode.value, (newVal) => {
  isEmailDarkMode.value = newVal !== 'light'
})

onMounted(() => {
  fetchCustomization()
})

// Multi-selection state
const selectedMessageIds = ref<Set<string>>(new Set())

// Context Menu State
const isContextMenuOpen = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuMsg = ref<any | null>(null)

// Attachment Preview State
const isAttachmentModalOpen = ref(false)
const selectedAttachment = ref<any | null>(null)

const isPreviewableAttachment = (att: any) => {
  if (!att || !att.filename) return false
  const fn = att.filename.toLowerCase()
  const ct = (att.contentType || '').toLowerCase()

  if (ct.startsWith('image/') || ct.startsWith('video/') || ct.startsWith('audio/') || ct.startsWith('text/') || ct === 'application/pdf') {
    return true
  }

  return /\.(png|jpe?g|gif|webp|svg|heic|heif|mp4|webm|mov|mkv|mp3|wav|ogg|txt|json|csv|log|html|pdf)$/i.test(fn)
}

const openAttachment = (att: any, index?: number, msgId?: string, e?: Event) => {
  if (e) e.stopPropagation()
  const targetId = msgId || selectedMessageId.value
  if (!targetId || !props.accountId) return

  if (!isPreviewableAttachment(att)) {
    const params = new URLSearchParams({
      accountId: props.accountId,
      folder: props.folderPath || 'INBOX',
      uid: targetId,
      filename: att.filename || '',
      inline: 'false'
    })
    if (index !== undefined) params.set('index', index.toString())

    const downloadUrl = `/api/email/download?${params.toString()}`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = att.filename || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }

  selectedAttachment.value = {
    filename: att.filename,
    contentType: att.contentType,
    size: att.size,
    index: index
  }
  if (msgId) {
    selectedMessageId.value = msgId
    emits('select-message', msgId)
  }
  isAttachmentModalOpen.value = true
}

const toggleMessageSelection = (id: string, e?: Event) => {
  if (e) e.stopPropagation()
  const next = new Set(selectedMessageIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedMessageIds.value = next
}

const selectAllMessages = () => {
  const next = new Set<string>()
  filteredMessages.value.forEach(m => next.add(m.id))
  selectedMessageIds.value = next
}

const clearSelection = () => {
  selectedMessageIds.value = new Set()
}

const handleContextMenu = (e: MouseEvent, msg: any) => {
  e.preventDefault()
  e.stopPropagation()
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  contextMenuMsg.value = msg
  isContextMenuOpen.value = true
}

const fetchMessages = async (silent: boolean = false) => {
  if (!props.accountId) return
  const cacheKey = `${props.accountId}:${props.folderPath || 'INBOX'}`

  // INSTANT IN-MEMORY RENDER: If cached in client memory, show immediately with zero delay
  if (clientMessagesCache.value[cacheKey]) {
    messages.value = clientMessagesCache.value[cacheKey].messages
    totalMessages.value = clientMessagesCache.value[cacheKey].total
    isLoading.value = false
  } else if (!silent) {
    isLoading.value = true
  }

  try {
    const res: any = await $fetch('/api/email/messages', {
      query: {
        accountId: props.accountId,
        folder: props.folderPath || 'INBOX',
        forceSync: 'false'
      }
    })
    
    const fetchedMsgs = res.messages || []
    const fetchedTotal = res.total || 0

    messages.value = fetchedMsgs
    totalMessages.value = fetchedTotal

    // Store in instant client memory cache
    clientMessagesCache.value[cacheKey] = {
      messages: fetchedMsgs,
      total: fetchedTotal
    }

    if (props.initialMessageId && !selectedMessageDetail.value) {
      const match = messages.value.find(m => m.id === props.initialMessageId)
      if (match) {
        loadMessageDetail(props.initialMessageId)
      }
    }
  } catch (e) {
    console.error('Failed to fetch messages:', e)
  } finally {
    isLoading.value = false
  }
}

const loadMessageDetail = async (id: string) => {
  if (!props.accountId) return

  if (selectedMessageIds.value.size > 0) {
    toggleMessageSelection(id)
    return
  }

  selectedMessageId.value = id
  emits('select-message', id)
  isLoadingDetail.value = true
  try {
    const res: any = await $fetch(`/api/email/message/${id}`, {
      query: {
        accountId: props.accountId,
        folder: props.folderPath || 'INBOX'
      }
    })
    selectedMessageDetail.value = res
    
    // Mark as read
    const target = messages.value.find(m => m.id === id)
    if (target && !target.isRead) {
      target.isRead = true
      $fetch('/api/email/flags', {
        method: 'PUT',
        body: {
          accountId: props.accountId,
          folder: props.folderPath || 'INBOX',
          uid: id,
          flags: ['\\Seen'],
          add: true
        }
      }).catch(() => {})
    }
  } catch (e) {
    console.error('Failed to load message detail:', e)
    selectedMessageDetail.value = null
  } finally {
    isLoadingDetail.value = false
  }
}

const handleManualRefresh = () => {
  if (props.accountId) {
    syncAccount(props.accountId)
    toast.info('Sync Started', 'Checking for new messages...')
  }
}

const filteredMessages = computed(() => {
  if (!searchQuery.value.trim()) return messages.value
  const q = searchQuery.value.toLowerCase()
  return messages.value.filter(m =>
    m.subject.toLowerCase().includes(q) ||
    m.snippet.toLowerCase().includes(q) ||
    m.from?.some((f: any) => f.name.toLowerCase().includes(q) || f.address.toLowerCase().includes(q))
  )
})

const moveSpecificMessages = async (uids: string[], targetFolder: string) => {
  if (!props.accountId || !uids || uids.length === 0) return
  const count = uids.length
  try {
    await $fetch('/api/email/move', {
      method: 'POST',
      body: {
        accountId: props.accountId,
        uids: uids,
        fromFolder: props.folderPath || 'INBOX',
        toFolder: targetFolder
      }
    })
    const uidSet = new Set(uids)
    messages.value = messages.value.filter(m => !uidSet.has(m.id))
    
    // Update memory cache
    const cacheKey = `${props.accountId}:${props.folderPath || 'INBOX'}`
    if (clientMessagesCache.value[cacheKey]) {
      clientMessagesCache.value[cacheKey].messages = messages.value
      clientMessagesCache.value[cacheKey].total = messages.value.length
    }

    if (selectedMessageId.value && uidSet.has(selectedMessageId.value)) {
      selectedMessageId.value = null
      selectedMessageDetail.value = null
      emits('select-message', null)
    }

    if (targetFolder.toLowerCase() === 'trash' || targetFolder.toLowerCase().includes('papierkorb')) {
      toast.success(count > 1 ? `${count} Emails Deleted` : 'Email Deleted', 'Moved to Trash')
    } else {
      toast.success(count > 1 ? `${count} Emails Moved` : 'Email Moved', `Moved to ${targetFolder}`)
    }

    clearSelection()
  } catch (e) {
    toast.error('Move Failed', 'Could not move email(s)')
  }
}

const handleMarkRead = (msg: any) => {
  msg.isRead = true
  toast.info('Marked as Read', msg.subject)
  $fetch('/api/email/flags', {
    method: 'PUT',
    body: {
      accountId: props.accountId,
      folder: props.folderPath || 'INBOX',
      uid: msg.id,
      flags: ['\\Seen'],
      add: true
    }
  }).catch(() => {})
}

const handleMarkUnread = (msg: any) => {
  msg.isRead = false
  toast.info('Marked as Unread', msg.subject)
  $fetch('/api/email/flags', {
    method: 'PUT',
    body: {
      accountId: props.accountId,
      folder: props.folderPath || 'INBOX',
      uid: msg.id,
      flags: ['\\Seen'],
      add: false
    }
  }).catch(() => {})
}

const handleSetTag = async ({ msg, tag, add }: { msg: any; tag: string; add: boolean }) => {
  if (!props.accountId || !msg) return
  if (!msg.flags) msg.flags = []

  if (add) {
    if (!msg.flags.includes(tag)) msg.flags.push(tag)
  } else {
    msg.flags = msg.flags.filter((f: string) => f !== tag)
  }

  const cleanTagName = tag.replace('\\', '').replace('$', '')
  toast.success(add ? 'Tag Added' : 'Tag Removed', `Tag: ${cleanTagName}`)

  try {
    await $fetch('/api/email/flags', {
      method: 'PUT',
      body: {
        accountId: props.accountId,
        folder: props.folderPath || 'INBOX',
        uid: msg.id,
        flags: [tag],
        add
      }
    })
  } catch (e) {
    console.error('Failed to update flag:', e)
  }
}

const bulkMarkRead = (isRead: boolean) => {
  selectedMessageIds.value.forEach(id => {
    const msg = messages.value.find(m => m.id === id)
    if (msg) {
      if (isRead) handleMarkRead(msg)
      else handleMarkUnread(msg)
    }
  })
}

const bulkDelete = () => {
  moveSpecificMessages(Array.from(selectedMessageIds.value), 'Trash')
}

const handleReply = (msg: any) => {
  const replyTo = msg.from?.[0]?.address || ''
  emits('reply-mail', { to: replyTo, subject: `Re: ${msg.subject}` })
}

const handleForward = (msg: any) => {
  emits('forward-mail', { subject: `Fwd: ${msg.subject}` })
}

// Custom Drag Ghost Image Handler
const handleDragStart = (e: DragEvent, msg: any) => {
  let uidsToDrag = [msg.id]
  if (selectedMessageIds.value.has(msg.id) && selectedMessageIds.value.size > 1) {
    uidsToDrag = Array.from(selectedMessageIds.value)
  }

  const payload = {
    accountId: props.accountId,
    uids: uidsToDrag
  }

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(payload))
    e.dataTransfer.setData('text/plain', JSON.stringify(payload))

    // Create a sleek, custom floating drag card
    const dragEl = document.createElement('div')
    dragEl.style.position = 'absolute'
    dragEl.style.top = '-9999px'
    dragEl.style.left = '-9999px'
    dragEl.style.padding = '8px 12px'
    dragEl.style.borderRadius = '12px'
    dragEl.style.background = 'rgba(9, 9, 11, 0.95)'
    dragEl.style.border = '1px solid rgba(99, 102, 241, 0.5)'
    dragEl.style.boxShadow = '0 12px 30px -5px rgba(79, 70, 229, 0.4)'
    dragEl.style.color = '#ffffff'
    dragEl.style.fontSize = '12px'
    dragEl.style.fontWeight = '600'
    dragEl.style.pointerEvents = 'none'
    dragEl.style.display = 'flex'
    dragEl.style.alignItems = 'center'
    dragEl.style.gap = '8px'
    dragEl.style.zIndex = '99999'

    const countText = uidsToDrag.length > 1
      ? `${uidsToDrag.length} E-Mails verschieben`
      : (msg.subject || 'E-Mail verschieben')

    dragEl.innerHTML = `
      <div style="width: 22px; height: 22px; border-radius: 6px; background: rgba(99, 102, 241, 0.25); border: 1px solid rgba(99, 102, 241, 0.4); display: flex; align-items: center; justify-content: center; color: #a5b4fc;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <span style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: sans-serif;">${countText}</span>
    `

    document.body.appendChild(dragEl)
    e.dataTransfer.setDragImage(dragEl, 15, 15)

    setTimeout(() => {
      if (document.body.contains(dragEl)) {
        document.body.removeChild(dragEl)
      }
    }, 0)
  }
}

watch([() => props.accountId, () => props.folderPath], () => {
  selectedMessageId.value = null
  selectedMessageDetail.value = null
  emits('select-message', null)
  clearSelection()
  fetchMessages(false)
}, { immediate: true })

watch(lastSyncTimestamp, () => {
  fetchMessages(true)
})

const formatDate = (d: string | Date) => {
  if (!d) return ''
  const date = new Date(d)
  if (customization.value.dateFormat === 'absolute') {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

defineExpose({
  moveSpecificMessages,
  loadMessageDetail
})
</script>

<template>
  <div class="flex-1 flex h-full overflow-hidden bg-zinc-900">
    <!-- Message List Column -->
    <div class="w-80 md:w-96 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full shrink-0 relative">
      <!-- Search Topbar -->
      <div class="p-3 border-b border-zinc-800 space-y-2 shrink-0 bg-zinc-950">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm text-white capitalize">{{ (folderPath || '').toUpperCase() === 'INBOX' ? 'Inbox' : folderPath }}</h2>
          <button @click="handleManualRefresh" :disabled="isSyncing" class="text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors" title="Sync Inbox">
            <Icon name="lucide:rotate-cw" :class="['w-3.5 h-3.5', isSyncing ? 'animate-spin text-indigo-400' : '']" />
          </button>
        </div>
        <div class="relative">
          <Icon name="lucide:search" class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <Input v-model="searchQuery" placeholder="Search emails..." class="pl-8 bg-zinc-900 border-zinc-800 text-xs h-8 text-white" />
        </div>
      </div>

      <!-- Floating Glassmorphic Bulk Actions Overlay Bar -->
      <Transition name="modal-fade">
        <div
          v-if="selectedMessageIds.size > 0"
          class="absolute bottom-4 left-3 right-3 z-30 bg-zinc-950/95 border border-indigo-500/50 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl flex items-center justify-between text-xs text-white"
        >
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-[11px]">
              {{ selectedMessageIds.size }}
            </span>
            <span class="font-medium text-zinc-200">selected</span>
            <button @click="selectAllMessages" class="text-[11px] text-zinc-400 hover:text-white underline ml-1">
              All
            </button>
            <button @click="clearSelection" class="text-[11px] text-zinc-400 hover:text-white underline">
              Clear
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <button @click="bulkMarkRead(true)" title="Mark as Read" class="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-indigo-500/20 transition-colors">
              <Icon name="lucide:check-circle" class="w-4 h-4 text-indigo-400" />
            </button>
            <button @click="bulkMarkRead(false)" title="Mark as Unread" class="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-indigo-500/20 transition-colors">
              <Icon name="lucide:circle" class="w-4 h-4 text-indigo-400" />
            </button>
            <button @click="bulkDelete" title="Delete Selected" class="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/20 transition-colors">
              <Icon name="lucide:trash-2" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </Transition>

      <!-- Messages List -->
      <div class="flex-1 overflow-y-auto border-t border-zinc-800/40">
        <div v-if="isLoading && messages.length === 0" class="p-8 text-center text-xs text-zinc-500">
          <Icon name="lucide:loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          <span>Loading emails...</span>
        </div>

        <div v-else-if="filteredMessages.length === 0" class="p-8 text-center text-xs text-zinc-500">
          No messages in this folder.
        </div>

        <div
          v-for="msg in filteredMessages"
          :key="msg.id"
          draggable="true"
          @dragstart="handleDragStart($event, msg)"
          @click="loadMessageDetail(msg.id)"
          @contextmenu.prevent.stop="handleContextMenu($event, msg)"
          :class="[
            'flex items-start cursor-pointer transition-all duration-150 select-none group border-l-4 border-b border-zinc-900/60 shadow-none',
            customization.density === 'compact' ? 'px-3 py-1.5 gap-2' : 'px-3 py-2.5 gap-2.5',
            selectedMessageIds.has(msg.id)
              ? 'bg-indigo-600/20 border-l-indigo-500 text-white'
              : (selectedMessageId === msg.id
                  ? 'bg-zinc-800/90 border-l-indigo-500 text-white'
                  : 'border-l-transparent text-zinc-300 hover:bg-zinc-900/80 hover:translate-x-0.5 hover:border-l-indigo-500/40')
          ]"
        >
          <!-- Email Avatar -->
          <div @click.stop="toggleMessageSelection(msg.id, $event)" class="cursor-pointer shrink-0 mt-0.5">
            <EmailAvatar
              :name="msg.from?.[0]?.name"
              :address="msg.from?.[0]?.address"
              :isSelected="selectedMessageIds.has(msg.id)"
            />
          </div>

          <!-- Message Content Details -->
          <div class="flex-1 min-w-0 flex flex-col gap-0">
            <!-- Sender Name: BOLD text-sm if unread -->
            <div class="flex items-center justify-between text-zinc-400 leading-tight">
              <span :class="['truncate max-w-[180px] text-sm', !msg.isRead ? 'font-bold text-white' : 'font-semibold text-zinc-200']">
                {{ msg.from?.[0]?.name || msg.from?.[0]?.address || 'Unknown' }}
              </span>
              <span :class="['text-xs shrink-0', !msg.isRead ? 'font-semibold text-indigo-300' : 'text-zinc-500']">{{ formatDate(msg.date) }}</span>
            </div>

            <!-- Subject: text-[13px] directly below Sender Name -->
            <div class="truncate flex items-center gap-1.5 leading-tight">
              <span v-if="!msg.isRead" class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
              <span :class="['truncate text-[13px]', !msg.isRead ? 'font-bold text-white' : 'font-medium text-zinc-200']">{{ msg.subject }}</span>
            </div>

            <!-- Flags & Tags Badges -->
            <div v-if="msg.flags && msg.flags.length > 0" class="flex flex-wrap gap-1 my-0.5">
              <span v-if="msg.flags.includes('\\Flagged')" class="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                <Icon name="lucide:star" class="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Starred
              </span>
              <span v-if="msg.flags.includes('$Important')" class="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.2 rounded font-mono">
                <Icon name="lucide:flag" class="w-2.5 h-2.5 text-red-400" /> High Priority
              </span>
              <span v-if="msg.flags.includes('$Work')" class="inline-flex items-center gap-1 text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono">
                <Icon name="lucide:briefcase" class="w-2.5 h-2.5 text-indigo-400" /> Work
              </span>
              <span v-if="msg.flags.includes('$Personal')" class="inline-flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                <Icon name="lucide:user" class="w-2.5 h-2.5 text-emerald-400" /> Personal
              </span>
            </div>

            <!-- List Item Attachments Badges -->
            <div v-if="msg.attachments && msg.attachments.length > 0" class="flex flex-wrap gap-1 my-0.5">
              <button
                v-for="(att, i) in msg.attachments"
                :key="i"
                @click.stop="openAttachment(att, i, msg.id, $event)"
                class="flex items-center gap-1 text-[10px] bg-zinc-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-zinc-700/50 px-1.5 py-0.5 rounded text-zinc-300 transition-colors shrink-0 cursor-pointer"
                :title="isPreviewableAttachment(att) ? 'Click to preview' : 'Click to download'"
              >
                <Icon name="lucide:paperclip" class="w-3 h-3 text-indigo-400" />
                <span class="truncate max-w-[100px]">{{ att.filename }}</span>
              </button>
            </div>

            <!-- Snippet Content Paragraph (Only shown in Comfortable density mode when real body snippet exists) -->
            <p v-if="customization.density !== 'compact' && msg.snippet && msg.snippet.trim() !== msg.subject.trim()" :class="['text-xs line-clamp-2 leading-relaxed mt-0.5', !msg.isRead ? 'text-zinc-200 font-medium' : 'text-zinc-400']">
              {{ msg.snippet }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Reading View -->
    <div class="flex-1 flex flex-col h-full bg-zinc-900 overflow-hidden relative">
      <!-- Top Right Floating Theme Switcher when no email is open -->
      <div v-if="!selectedMessageId" class="absolute top-4 right-4 z-20">
        <ThemeSwitcher />
      </div>

      <div v-if="!selectedMessageId" class="flex-1 flex items-center justify-center text-zinc-500 text-xs flex-col gap-2">
        <Icon name="lucide:mail-open" class="w-12 h-12 text-zinc-700 stroke-[1.5]" />
        <span>Select an email from the list to read.</span>
      </div>

      <div v-else-if="isLoadingDetail" class="flex-1 flex items-center justify-center text-zinc-400 text-xs gap-2">
        <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin text-indigo-500" />
        <span>Loading message details...</span>
      </div>

      <div v-else-if="selectedMessageDetail" class="flex-1 flex flex-col h-full overflow-hidden">
        <!-- Message Actions Topbar with Theme Switcher & Email Dark Mode Toggle in top right -->
        <div class="p-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <Button size="sm" variant="ghost" @click="moveSpecificMessages([selectedMessageId], 'Trash')" class="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Icon name="lucide:trash-2" class="w-4 h-4 mr-1" />
              <span>Delete</span>
            </Button>

            <Button size="sm" variant="ghost" @click="handleReply(selectedMessageDetail)" class="text-xs text-zinc-300 hover:text-white">
              <Icon name="lucide:reply" class="w-4 h-4 mr-1" />
              <span>Reply</span>
            </Button>

            <Button size="sm" variant="ghost" @click="handleForward(selectedMessageDetail)" class="text-xs text-zinc-300 hover:text-white">
              <Icon name="lucide:forward" class="w-4 h-4 mr-1" />
              <span>Forward</span>
            </Button>
          </div>

          <!-- Top Right Corner Controls: Email Body Mode + Theme Switcher + Message ID -->
          <div class="flex items-center gap-2.5">
            <!-- Email Body Dark/Original Mode Toggle -->
            <button
              @click="isEmailDarkMode = !isEmailDarkMode"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs border font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm',
                isEmailDarkMode ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              ]"
              :title="isEmailDarkMode ? 'Click to view Original White HTML layout' : 'Click to adapt HTML layout to Dark Mode'"
            >
              <Icon :name="isEmailDarkMode ? 'lucide:moon-star' : 'lucide:sun'" class="w-3.5 h-3.5 text-indigo-400" />
              <span>{{ isEmailDarkMode ? 'Dark Mail' : 'Original White' }}</span>
            </button>

            <ThemeSwitcher />

            <div class="text-xs text-zinc-400 font-mono hidden md:block">
              ID: {{ selectedMessageDetail.id }}
            </div>
          </div>
        </div>

        <!-- Email Body & Detail Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Header info -->
          <div class="space-y-3 pb-4 border-b border-zinc-800">
            <h1 class="text-xl font-bold text-white tracking-tight leading-snug">
              {{ selectedMessageDetail.subject }}
            </h1>

            <div class="flex items-center justify-between text-xs">
              <div>
                <div class="text-zinc-200 font-medium">
                  From: {{ selectedMessageDetail.from?.[0]?.name }} &lt;{{ selectedMessageDetail.from?.[0]?.address }}&gt;
                </div>
                <div class="text-zinc-400 text-[11px] mt-0.5">
                  To: <span v-for="t in selectedMessageDetail.to" :key="t.address">{{ t.name || t.address }} </span>
                </div>
              </div>
              <div class="text-zinc-400 font-mono text-[11px]">
                {{ formatDate(selectedMessageDetail.date) }}
              </div>
            </div>

            <!-- Top Attachments Bar in Reading View -->
            <div v-if="selectedMessageDetail.attachments && selectedMessageDetail.attachments.length > 0" class="pt-2 flex flex-wrap gap-2">
              <button
                v-for="(att, idx) in selectedMessageDetail.attachments"
                :key="att.filename"
                @click="openAttachment(att, idx, selectedMessageDetail.id)"
                class="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-zinc-800 text-xs flex items-center gap-2 text-zinc-200 transition-all cursor-pointer group"
                :title="isPreviewableAttachment(att) ? 'Click to preview' : 'Click to download'"
              >
                <Icon name="lucide:paperclip" class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span class="truncate max-w-[180px] font-medium">{{ att.filename }}</span>
                <span class="text-[10px] text-zinc-500">({{ Math.round(att.size / 1024) }} KB)</span>
              </button>
            </div>
          </div>

          <!-- Isolated Shadow DOM HTML Viewer (Adapts to Dark Mode / Legible colors) -->
          <div
            v-if="selectedMessageDetail.html"
            :class="[
              'p-5 rounded-xl border transition-colors overflow-x-auto',
              isEmailDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-900'
            ]"
          >
            <ShadowRoot :content="selectedMessageDetail.html" :darkMode="isEmailDarkMode" />
          </div>

          <div
            v-else
            class="whitespace-pre-wrap text-sm font-sans leading-relaxed p-5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200"
          >
            {{ selectedMessageDetail.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- Right-click Animated Context Menu -->
    <ContextMenu
      :isOpen="isContextMenuOpen"
      :x="contextMenuPos.x"
      :y="contextMenuPos.y"
      :message="contextMenuMsg"
      @close="isContextMenuOpen = false"
      @mark-read="handleMarkRead"
      @mark-unread="handleMarkUnread"
      @reply="handleReply"
      @forward="handleForward"
      @set-tag="handleSetTag"
      @move-trash="moveSpecificMessages([contextMenuMsg?.id], 'Trash')"
    />

    <!-- Attachment Preview & Download Modal -->
    <AttachmentPreviewModal
      :isOpen="isAttachmentModalOpen"
      :accountId="accountId || undefined"
      :folder="folderPath"
      :uid="selectedMessageId || undefined"
      :attachment="selectedAttachment"
      @close="isAttachmentModalOpen = false"
    />
  </div>
</template>
