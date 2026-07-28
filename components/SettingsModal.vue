<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Card from '~/components/ui/card/Card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import CustomSelect from '~/components/CustomSelect.vue'
import CustomFontDropdown from '~/components/CustomFontDropdown.vue'

const props = defineProps<{
  isOpen: boolean
  initialTab?: 'accounts' | 'customization'
}>()

const emits = defineEmits<{
  (e: 'close'): void
}>()

const activeTab = ref<'accounts' | 'customization'>(props.initialTab || 'accounts')

watch(() => props.initialTab, (newTab) => {
  if (newTab) activeTab.value = newTab
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emits('close')
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

// --- ACCOUNTS & STORAGE STATE ---
const { allAccounts, fetchAccounts } = useEmail()
const toast = useToast()

// Password Edit Modal State
const isPasswordModalOpen = ref(false)
const editAccountId = ref<string | null>(null)
const editAccountName = ref('')
const editPasswordInput = ref('')
const isSavingPassword = ref(false)

// Delete Account Modal State
const isDeleteModalOpen = ref(false)
const deleteAccountId = ref<string | null>(null)
const deleteAccountName = ref('')
const isDeletingAccount = ref(false)

// Mailcow Form State
const mailcowHost = ref('')
const mailcowApiKey = ref('')
const isSavingMailcow = ref(false)
const isSyncingMailcow = ref(false)

// Storage Stats State
const cacheSizeMb = ref(0)
const cacheFileCount = ref(0)
const isClearingCache = ref(false)

// Prefetch Background Task Worker Status State
const prefetchStatus = ref({
  isRunning: false,
  messagesCached: 0,
  foldersProcessed: 0
})
let prefetchPollInterval: any = null

// Global Sync & Cache Intervals State (ms)
const selectedCachePrefetchInterval = ref<number>(0)
const selectedEmailSyncInterval = ref<number>(30000)

const cachePrefetchIntervalOptions = [
  { value: 0, label: 'Never (Manual Only)' },
  { value: 60000, label: 'Every 1 minute' },
  { value: 300000, label: 'Every 5 minutes' },
  { value: 1800000, label: 'Every 30 minutes' },
  { value: 3600000, label: 'Every 1 hour' },
  { value: 43200000, label: 'Every 12 hours' },
  { value: 86400000, label: 'Every 24 hours' }
]

const emailSyncIntervalOptions = [
  { value: 5000, label: 'Every 5 seconds' },
  { value: 30000, label: 'Every 30 seconds (Default)' },
  { value: 60000, label: 'Every 1 minute' },
  { value: 300000, label: 'Every 5 minutes' },
  { value: 1800000, label: 'Every 30 minutes' },
  { value: 3600000, label: 'Every 1 hour' },
  { value: 43200000, label: 'Every 12 hours' },
  { value: 86400000, label: 'Every 24 hours' }
]

const fetchIntervalSettings = async () => {
  try {
    const data: any = await $fetch('/api/email/settings/intervals')
    if (data) {
      selectedCachePrefetchInterval.value = data.cacheInterval ?? 0
      selectedEmailSyncInterval.value = data.emailSyncInterval ?? 30000
    }
  } catch (e) {
    console.error('Failed to fetch interval settings:', e)
  }
}

const handleSaveIntervals = async () => {
  try {
    await $fetch('/api/email/settings/intervals', {
      method: 'PUT',
      body: {
        cacheInterval: selectedCachePrefetchInterval.value,
        emailSyncInterval: selectedEmailSyncInterval.value
      }
    })
    toast.success('Intervals Saved', 'Global sync and cache timer settings updated.')
  } catch (e: any) {
    toast.error('Failed to save intervals', e.data?.message || 'Could not save interval settings.')
  }
}

const fetchStorageStats = async () => {
  try {
    const data: any = await $fetch('/api/email/cache')
    if (data) {
      cacheSizeMb.value = data.sizeMb || 0
      cacheFileCount.value = data.fileCount || 0
    }
  } catch (e) {
    console.error('Failed to fetch storage stats:', e)
  }
}

const fetchPrefetchStatus = async () => {
  try {
    const data: any = await $fetch('/api/email/cache/prefetch')
    if (data) {
      prefetchStatus.value = {
        isRunning: !!data.isRunning,
        messagesCached: data.messagesCached || 0,
        foldersProcessed: data.foldersProcessed || 0
      }
      if (data.isRunning) {
        fetchStorageStats()
      }
    }
  } catch (e) {
    console.error('Failed to fetch prefetch status:', e)
  }
}

const handlePrefetchAllCache = async () => {
  try {
    await $fetch('/api/email/cache/prefetch', { method: 'POST' })
    toast.info('Offline Cache Sync Started', 'Downloading all folder message bodies in background...')
    await fetchPrefetchStatus()
  } catch (e: any) {
    toast.error('Prefetch Failed', e.data?.message || 'Could not start offline prefetch worker.')
  }
}

const handleClearCache = async () => {
  isClearingCache.value = true
  try {
    await $fetch('/api/email/cache', { method: 'DELETE' })
    toast.success('Cache Cleared', 'Offline message cache has been purged.')
    await fetchStorageStats()
  } catch (e: any) {
    toast.error('Clear Failed', e.data?.message || 'Could not clear offline cache.')
  } finally {
    isClearingCache.value = false
  }
}

const fetchMailcowSettings = async () => {
  try {
    const data: any = await $fetch('/api/mailcow/settings')
    if (data) {
      mailcowHost.value = data.host || ''
      mailcowApiKey.value = data.apiKey || ''
    }
  } catch (e) {
    console.error('Failed to fetch Mailcow settings:', e)
  }
}

const handleToggleAccountVisibility = async (acc: any) => {
  const newVisibility = acc.visible === false ? true : false
  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: { id: acc.id, visible: newVisibility }
    })
    toast.success(newVisibility ? 'Account Visible' : 'Account Hidden', `Account ${acc.email} updated.`)
    await fetchAccounts(true)
  } catch (e: any) {
    toast.error('Update Failed', e.data?.message || 'Could not update account visibility.')
  }
}

const handleOpenPasswordModal = (acc: any) => {
  editAccountId.value = acc.id
  editAccountName.value = acc.name || acc.email
  editPasswordInput.value = ''
  isPasswordModalOpen.value = true
}

const handleSavePassword = async () => {
  if (!editAccountId.value || !editPasswordInput.value) return
  isSavingPassword.value = true
  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: {
        id: editAccountId.value,
        password: editPasswordInput.value
      }
    })
    toast.success('Password Updated', `Credentials updated for ${editAccountName.value}`)
    isPasswordModalOpen.value = false
    await fetchAccounts(true)
  } catch (e: any) {
    toast.error('Update Failed', e.data?.message || 'Could not update password.')
  } finally {
    isSavingPassword.value = false
  }
}

const handleOpenDeleteModal = (acc: any) => {
  deleteAccountId.value = acc.id
  deleteAccountName.value = acc.name || acc.email
  isDeleteModalOpen.value = true
}

const handleDeleteAccount = async () => {
  if (!deleteAccountId.value) return
  isDeletingAccount.value = true
  try {
    await $fetch('/api/email/account/delete', {
      method: 'POST',
      body: { id: deleteAccountId.value }
    })
    toast.success('Account Deleted', `${deleteAccountName.value} was removed.`)
    isDeleteModalOpen.value = false
    await fetchAccounts(true)
  } catch (e: any) {
    toast.error('Delete Failed', e.data?.message || 'Could not delete account.')
  } finally {
    isDeletingAccount.value = false
  }
}

const handleSaveMailcow = async () => {
  isSavingMailcow.value = true
  try {
    await $fetch('/api/mailcow/settings', {
      method: 'PUT',
      body: {
        host: mailcowHost.value.trim(),
        apiKey: mailcowApiKey.value.trim()
      }
    })
    toast.success('Mailcow Settings Saved', 'Host and API key stored successfully.')
  } catch (e: any) {
    toast.error('Save Failed', e.data?.message || 'Failed to save Mailcow settings.')
  } finally {
    isSavingMailcow.value = false
  }
}

const triggerMailcowSync = async () => {
  isSyncingMailcow.value = true
  try {
    const res: any = await $fetch('/api/mailcow/sync', { method: 'POST' })
    toast.success('Mailcow Sync Complete', `${res.added || 0} new accounts imported.`)
    await fetchAccounts(true)
  } catch (e: any) {
    toast.error('Mailcow Sync Failed', e.data?.message || 'Could not sync with Mailcow server.')
  } finally {
    isSyncingMailcow.value = false
  }
}

// --- CUSTOMIZATION STATE ---
const { customization, fetchCustomization, saveCustomization } = useCustomization()
const { currentFontId, currentFontSizePx, FONT_OPTIONS, FONT_SIZE_OPTIONS, setFont, setFontSizePx, initFont } = useFont()

const appNameInput = ref('')
const selectedAccentColor = ref('#6366f1')
const selectedDensity = ref<'comfortable' | 'compact'>('comfortable')
const selectedDateFormat = ref<'relative' | 'absolute'>('relative')

const selectedFontId = ref('inter')
const selectedFontSizePx = ref<number>(15)
const isSavingCustomization = ref(false)

const accentPresets = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Ocean Blue', color: '#3b82f6' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Crimson', color: '#ef4444' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Cyan', color: '#06b6d4' }
]

const fontSizeOptions = computed(() => {
  return FONT_SIZE_OPTIONS.map(s => ({
    value: s.sizePx,
    label: `${s.name} (${s.description})`
  }))
})

const densityOptions = [
  { value: 'comfortable', label: 'Comfortable (Standard Padding)' },
  { value: 'compact', label: 'Compact (Tighter Rows)' }
]

const dateFormatOptions = [
  { value: 'relative', label: 'Relative Time (e.g. 5m ago, Yesterday)' },
  { value: 'absolute', label: 'Absolute Date (e.g. Jul 28, 2026 00:30)' }
]

const selectPresetColor = (color: string) => {
  selectedAccentColor.value = color
}

const handleFontChange = (fontId: string) => {
  selectedFontId.value = fontId
  setFont(fontId)
}

const handleFontSizeChange = (px: string | number) => {
  const val = typeof px === 'string' ? parseFloat(px) : px
  selectedFontSizePx.value = val
  setFontSizePx(val)
}

const handleSaveCustomization = async () => {
  isSavingCustomization.value = true
  try {
    setFont(selectedFontId.value)
    setFontSizePx(selectedFontSizePx.value)
    await saveCustomization({
      appName: appNameInput.value.trim() || 'Mailium',
      accentColor: selectedAccentColor.value,
      density: selectedDensity.value,
      dateFormat: selectedDateFormat.value
    })
    toast.success('Customization Saved', 'Your design and font preferences have been updated.')
  } catch (e: any) {
    toast.error('Save Failed', e.data?.message || 'Failed to save customization.')
  } finally {
    isSavingCustomization.value = false
  }
}

watch(() => props.isOpen, async (newOpen) => {
  if (newOpen) {
    await fetchAccounts(true)
    await fetchStorageStats()
    await fetchPrefetchStatus()
    await fetchMailcowSettings()
    await fetchIntervalSettings()

    initFont()
    await fetchCustomization()
    appNameInput.value = customization.value.appName
    selectedAccentColor.value = customization.value.accentColor
    selectedDensity.value = customization.value.density
    selectedDateFormat.value = customization.value.dateFormat
    selectedFontId.value = currentFontId.value
    selectedFontSizePx.value = currentFontSizePx.value
  }
}, { immediate: true })
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="isOpen"
      @click.self="$emit('close')"
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 md:p-6 cursor-pointer select-none"
    >
      <div
        @click.stop
        class="bg-zinc-950 border border-zinc-800/90 rounded-2xl max-w-5xl w-full h-[85vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden cursor-default text-zinc-100"
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2.5">
              <div class="w-8.5 h-8.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Icon name="lucide:settings" class="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 class="font-bold text-base text-white tracking-tight leading-tight">Settings</h2>
                <p class="text-[11px] text-zinc-500 font-mono">Mailium Configuration</p>
              </div>
            </div>

            <!-- Tabs Navigation -->
            <div class="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                @click="activeTab = 'accounts'"
                :class="[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer',
                  activeTab === 'accounts' ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                ]"
              >
                <Icon name="lucide:server" class="w-3.5 h-3.5 text-indigo-400" />
                <span>Accounts & Storage</span>
              </button>

              <button
                @click="activeTab = 'customization'"
                :class="[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer',
                  activeTab === 'customization' ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                ]"
              >
                <Icon name="lucide:palette" class="w-3.5 h-3.5 text-indigo-400" />
                <span>Customization</span>
              </button>
            </div>
          </div>

          <!-- Close Button -->
          <button
            @click="$emit('close')"
            class="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          <!-- TAB 1: ACCOUNTS & STORAGE -->
          <div v-if="activeTab === 'accounts'" class="space-y-6">
            <!-- Storage & Offline Cache Management Card -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-visible">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Icon name="lucide:hard-drive" class="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle class="text-base font-bold text-white">Local Storage & Email Cache</CardTitle>
                      <CardDescription class="text-xs text-zinc-400">Manage offline message bodies, HTML structures, and background prefetching.</CardDescription>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="text-sm font-bold text-indigo-300 font-mono">{{ cacheSizeMb }} MB</div>
                      <div class="text-[10px] text-zinc-500 font-mono">{{ cacheFileCount }} cached files</div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      @click="handleClearCache"
                      :disabled="isClearingCache"
                      class="border-zinc-700 text-zinc-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-xs"
                    >
                      <Icon v-if="isClearingCache" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <Icon v-else name="lucide:trash-2" class="w-3.5 h-3.5 mr-1.5 text-red-400" />
                      <span>Clear Cache</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent class="p-4 space-y-4">
                <!-- Background Worker Prefetch Banner -->
                <div class="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <Icon name="lucide:cloud-download" class="w-4 h-4" />
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-white">Background Offline Prefetch Worker</span>
                        <Badge v-if="prefetchStatus.isRunning" class="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] animate-pulse">
                          Syncing Offline Cache...
                        </Badge>
                        <Badge v-else class="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                          Idle
                        </Badge>
                      </div>
                      <p class="text-[11px] text-zinc-400 mt-0.5">Pre-downloads all message bodies so they load instantly without server requests.</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    @click="handlePrefetchAllCache"
                    :disabled="prefetchStatus.isRunning"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shrink-0"
                  >
                    <Icon v-if="prefetchStatus.isRunning" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <Icon v-else name="lucide:download" class="w-3.5 h-3.5 mr-1.5" />
                    <span>Sync All Offline Cache</span>
                  </Button>
                </div>

                <!-- Global Sync & Cache Timer Intervals Configuration -->
                <div class="space-y-3 pt-1 border-t border-zinc-800/60">
                  <div class="flex items-center gap-2 text-xs font-bold text-zinc-200">
                    <Icon name="lucide:clock" class="w-4 h-4 text-indigo-400" />
                    <span>Global Automated Intervals</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                      <label class="text-xs font-semibold text-zinc-300">Global Mailbox Sync Interval</label>
                      <CustomSelect
                        v-model="selectedEmailSyncInterval"
                        :options="emailSyncIntervalOptions"
                        @change="handleSaveIntervals"
                      />
                      <p class="text-[11px] text-zinc-500">How often all mailboxes check IMAP for new emails (default: 30s).</p>
                    </div>

                    <div class="space-y-1.5">
                      <label class="text-xs font-semibold text-zinc-300">Offline Cache Prefetch Interval</label>
                      <CustomSelect
                        v-model="selectedCachePrefetchInterval"
                        :options="cachePrefetchIntervalOptions"
                        @change="handleSaveIntervals"
                      />
                      <p class="text-[11px] text-zinc-500">How often the server pre-downloads all message bodies for offline access.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Mailcow Integration Card -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon name="lucide:server" class="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle class="text-base font-bold text-white">Mailcow Integration</CardTitle>
                    <CardDescription class="text-xs text-zinc-400">Connect to your Mailcow server API for automated account sync.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent class="p-4 space-y-4">
                <form @submit.prevent="handleSaveMailcow" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-zinc-300">Mailcow Host API URL</label>
                    <Input v-model="mailcowHost" placeholder="https://mail.yourdomain.com" class="bg-zinc-950 border-zinc-800 text-xs h-9 text-white" />
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-zinc-300">API Key</label>
                    <Input v-model="mailcowApiKey" type="password" placeholder="API Key from Mailcow UI" class="bg-zinc-950 border-zinc-800 text-xs h-9 text-white" />
                  </div>

                  <div class="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-zinc-800/60">
                    <Button type="button" variant="outline" size="sm" @click="triggerMailcowSync" :disabled="isSyncingMailcow || !mailcowHost || !mailcowApiKey" class="border-zinc-700 text-xs text-zinc-300 hover:text-white">
                      <Icon v-if="isSyncingMailcow" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <Icon v-else name="lucide:refresh-cw" class="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                      <span>Sync Mailcow Accounts</span>
                    </Button>

                    <Button type="submit" size="sm" :disabled="isSavingMailcow" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                      <Icon v-if="isSavingMailcow" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Save Mailcow Credentials</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <!-- Configured Email Accounts List Card -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Icon name="lucide:mail" class="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle class="text-base font-bold text-white">Configured Email Accounts</CardTitle>
                      <CardDescription class="text-xs text-zinc-400">IMAP/SMTP credentials for active accounts.</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent class="p-4 space-y-3">
                <div v-if="allAccounts.length === 0" class="p-6 text-center text-xs text-zinc-500">
                  No email accounts configured yet.
                </div>

                <div
                  v-else
                  v-for="acc in allAccounts"
                  :key="acc.id"
                  :class="[
                    'p-4 rounded-xl border transition-all flex items-center justify-between',
                    acc.visible === false ? 'opacity-50 bg-zinc-950/40 border-zinc-900' : 'bg-zinc-950 border-zinc-800'
                  ]"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white text-sm">
                      {{ acc.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 :class="['font-bold text-sm', acc.visible === false ? 'text-zinc-400 line-through' : 'text-white']">{{ acc.name }}</h3>
                        <Badge v-if="!acc.hasPassword" class="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                          Password Required
                        </Badge>
                        <Badge v-else-if="acc.visible === false" class="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                          Hidden in Sidebar
                        </Badge>
                        <Badge v-else class="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                          Connected
                        </Badge>
                      </div>
                      <div class="text-xs text-zinc-400 font-mono mt-0.5">{{ acc.email }}</div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      @click="handleToggleAccountVisibility(acc)"
                      :class="[
                        'text-xs transition-colors',
                        acc.visible === false ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/10'
                      ]"
                      :title="acc.visible === false ? 'Click to show in sidebar' : 'Click to hide from sidebar'"
                    >
                      <Icon :name="acc.visible === false ? 'lucide:eye-off' : 'lucide:eye'" class="w-3.5 h-3.5 mr-1" />
                      <span>{{ acc.visible === false ? 'Hidden' : 'Visible' }}</span>
                    </Button>

                    <Button size="sm" variant="ghost" @click="handleOpenPasswordModal(acc)" class="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800">
                      <Icon name="lucide:key" class="w-3.5 h-3.5 mr-1 text-indigo-400" />
                      <span>{{ acc.hasPassword ? 'Change Password' : 'Set Password' }}</span>
                    </Button>

                    <Button size="sm" variant="ghost" @click="handleOpenDeleteModal(acc)" class="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                      <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- TAB 2: CUSTOMIZATION -->
          <div v-else-if="activeTab === 'customization'" class="space-y-6">
            <!-- Branding & Identity -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon name="lucide:layout" class="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle class="text-base font-bold text-white">Branding & Identity</CardTitle>
                    <CardDescription class="text-xs text-zinc-400">Customize the application title displayed in the sidebar header.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="p-4 space-y-4">
                <div class="space-y-1.5 max-w-md">
                  <label class="text-xs font-semibold text-zinc-300">App Name / Header Title</label>
                  <Input v-model="appNameInput" placeholder="Mailium" class="bg-zinc-950 border-zinc-800 text-xs h-9 text-white" />
                </div>
              </CardContent>
            </Card>

            <!-- Typography & Font Selector -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon name="lucide:type" class="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle class="text-base font-bold text-white">Typography & Font Engine</CardTitle>
                    <CardDescription class="text-xs text-zinc-400">Select Google Fonts and adjust baseline text size with live real-time rendering.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="p-4 space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-zinc-300">Font Family</label>
                    <CustomFontDropdown v-model="selectedFontId" :options="FONT_OPTIONS" @change="handleFontChange" />
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-zinc-300">Base Font Size</label>
                    <CustomSelect v-model="selectedFontSizePx" :options="fontSizeOptions" @change="handleFontSizeChange" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Display Density & Date Formatting -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon name="lucide:sliders" class="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle class="text-base font-bold text-white">Layout & Date Formats</CardTitle>
                    <CardDescription class="text-xs text-zinc-400">Control list row density and date timestamp formats.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="p-4 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-zinc-300">Inbox List Density</label>
                    <CustomSelect v-model="selectedDensity" :options="densityOptions" />
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-zinc-300">Timestamp Format</label>
                    <CustomSelect v-model="selectedDateFormat" :options="dateFormatOptions" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Color Palette & Accent Color Presets -->
            <Card class="border-zinc-800 bg-zinc-900/90 shadow-xl">
              <CardHeader class="pb-3 border-b border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon name="lucide:palette" class="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle class="text-base font-bold text-white">Accent Theme Presets</CardTitle>
                    <CardDescription class="text-xs text-zinc-400">Choose primary highlight color theme across UI components.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent class="p-4 space-y-4">
                <div class="flex flex-wrap gap-2.5">
                  <button
                    v-for="preset in accentPresets"
                    :key="preset.color"
                    type="button"
                    @click="selectPresetColor(preset.color)"
                    :class="[
                      'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer',
                      selectedAccentColor === preset.color
                        ? 'border-white bg-zinc-800 text-white shadow-md'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    ]"
                  >
                    <span class="w-3.5 h-3.5 rounded-full shrink-0" :style="{ backgroundColor: preset.color }"></span>
                    <span>{{ preset.name }}</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            <!-- Save Customization Button Footer -->
            <div class="flex justify-end pt-2">
              <Button
                type="button"
                @click="handleSaveCustomization"
                :disabled="isSavingCustomization"
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-6 py-2"
              >
                <Icon v-if="isSavingCustomization" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <span>Save Appearance Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Password Edit Modal inside Settings Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="isPasswordModalOpen" @click.self="isPasswordModalOpen = false" class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div @click.stop class="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <div class="flex items-center gap-2 text-white font-bold text-sm">
                <Icon name="lucide:key" class="w-4 h-4 text-indigo-400" />
                <span>Update Password for {{ editAccountName }}</span>
              </div>

              <form @submit.prevent="handleSavePassword" class="space-y-3">
                <div class="space-y-1">
                  <label class="text-xs text-zinc-400 font-medium">New Password</label>
                  <Input v-model="editPasswordInput" type="password" placeholder="Enter account password..." required autofocus class="bg-zinc-900 border-zinc-800 text-white text-xs h-9" />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" type="button" @click="isPasswordModalOpen = false" class="text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" :disabled="isSavingPassword" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    <Icon v-if="isSavingPassword" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1" />
                    <span>Save Password</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Account Delete Confirmation Modal inside Settings Modal -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="isDeleteModalOpen" @click.self="isDeleteModalOpen = false" class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div @click.stop class="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <div class="flex items-center gap-3 text-rose-400">
                <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Icon name="lucide:trash-2" class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="font-bold text-sm text-white">Delete Account?</h3>
                  <p class="text-xs text-zinc-400">This will remove credentials from Mailium.</p>
                </div>
              </div>

              <p class="text-xs text-zinc-300 leading-relaxed">
                Are you sure you want to remove <strong class="text-white">{{ deleteAccountName }}</strong>?
              </p>

              <div class="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" @click="isDeleteModalOpen = false" class="text-xs">
                  Cancel
                </Button>
                <Button @click="handleDeleteAccount" size="sm" :disabled="isDeletingAccount" class="bg-rose-600 hover:bg-rose-700 text-white text-xs">
                  <Icon v-if="isDeletingAccount" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Delete Account</span>
                </Button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </Transition>
</template>
