<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Card from '~/components/ui/card/Card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import Badge from '~/components/ui/badge/Badge.vue'
import CustomSelect from '~/components/CustomSelect.vue'

const { allAccounts, accounts, fetchAccounts, createFolder, syncAccount, isSyncing } = useEmail()
const toast = useToast()

const route = useRoute()

// Pre-fill / highlight selected account if passed via URL query
const highlightedAccountId = ref<string | null>((route.query.id as string) || null)

// Account Form State
const isAddModalOpen = ref(false)
const isSubmitting = ref(false)

const newAccountName = ref('')
const newAccountEmail = ref('')
const newAccountHost = ref('')
const newAccountPort = ref(993)
const newAccountTls = ref(true)
const newAccountUsername = ref('')
const newAccountPassword = ref('')
const newAccountSmtpHost = ref('')
const newAccountSmtpPort = ref(465)
const newAccountSmtpTls = ref(true)

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
    toast.info('Background Task Started', 'Caching all emails in background. You can navigate away safely.')
    fetchPrefetchStatus()
  } catch (e: any) {
    toast.error('Prefetch Failed', e.data?.message || 'Could not start background caching.')
  }
}

const handleClearCache = async () => {
  isClearingCache.value = true
  try {
    await $fetch('/api/email/cache', { method: 'DELETE' })
    toast.success('Cache Cleared', 'Local storage email cache emptied successfully.')
    await fetchStorageStats()
  } catch (e: any) {
    toast.error('Clear Failed', 'Failed to clear email cache.')
  } finally {
    isClearingCache.value = false
  }
}

const handleToggleAccountVisibility = async (acc: any) => {
  const newVisible = acc.visible === false ? true : false
  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: { id: acc.id, visible: newVisible }
    })
    toast.info(newVisible ? 'Account Visible' : 'Account Hidden', `${acc.name} visibility updated in sidebar.`)
    await fetchAccounts(true)
  } catch (e: any) {
    toast.error('Failed to update visibility', 'Could not toggle account visibility.')
  }
}

onMounted(async () => {
  await fetchAccounts(true)
  await fetchStorageStats()
  await fetchPrefetchStatus()
  await fetchIntervalSettings()

  prefetchPollInterval = setInterval(() => {
    fetchPrefetchStatus()
  }, 3000)

  try {
    const settings: any = await $fetch('/api/mailcow/settings')
    if (settings) {
      mailcowHost.value = settings.host || ''
      mailcowApiKey.value = settings.apiKey || ''
    }
  } catch (e) {
    console.error('Failed to load Mailcow settings:', e)
  }
})

onUnmounted(() => {
  if (prefetchPollInterval) {
    clearInterval(prefetchPollInterval)
  }
})

const handleOpenPasswordModal = (acc: any) => {
  editAccountId.value = acc.id
  editAccountName.value = acc.name
  editPasswordInput.value = ''
  isPasswordModalOpen.value = true
}

const handleSavePassword = async () => {
  if (!editAccountId.value || !editPasswordInput.value.trim()) return
  isSavingPassword.value = true
  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: {
        id: editAccountId.value,
        password: editPasswordInput.value.trim()
      }
    })
    toast.success('Password Saved', `Password updated for ${editAccountName.value}`)
    isPasswordModalOpen.value = false
    editPasswordInput.value = ''
    await fetchAccounts(true)
  } catch (e: any) {
    toast.error('Save Failed', e.data?.message || 'Could not save password.')
  } finally {
    isSavingPassword.value = false
  }
}

const handleOpenDeleteModal = (acc: any) => {
  deleteAccountId.value = acc.id
  deleteAccountName.value = acc.name
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
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <NuxtLink to="/" class="text-xs text-indigo-400 hover:underline flex items-center gap-1 mb-1">
            <Icon name="lucide:arrow-left" class="w-3.5 h-3.5" />
            <span>Back to Inbox</span>
          </NuxtLink>
          <h1 class="text-2xl font-bold text-white tracking-tight">Account & Server Settings</h1>
        </div>
      </div>

      <!-- Settings Navigation Tabs Header -->
      <div class="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <NuxtLink
          to="/settings/accounts"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
        >
          <Icon name="lucide:server" class="w-4 h-4" />
          <span>Accounts & Storage</span>
        </NuxtLink>

        <NuxtLink
          to="/settings/customization"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
        >
          <Icon name="lucide:palette" class="w-4 h-4" />
          <span>Customization</span>
        </NuxtLink>
      </div>

      <!-- Storage & Offline Cache Management Card -->
      <Card class="border-zinc-800 bg-zinc-900 shadow-xl overflow-visible">
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

              <!-- Cache All Emails Offline (Background Task) Button -->
              <Button
                size="sm"
                @click="handlePrefetchAllCache"
                :disabled="prefetchStatus.isRunning || isClearingCache"
                class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                <Icon v-if="prefetchStatus.isRunning" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-200" />
                <Icon v-else name="lucide:cloud-download" class="w-3.5 h-3.5 mr-1.5" />
                <span>{{ prefetchStatus.isRunning ? 'Caching in Background...' : 'Cache All Emails Offline' }}</span>
              </Button>

              <!-- Clear Cache Button -->
              <Button
                size="sm"
                @click="handleClearCache"
                :disabled="isClearingCache || prefetchStatus.isRunning || cacheSizeMb === 0"
                variant="outline"
                class="border-zinc-700 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs"
              >
                <Icon v-if="isClearingCache" name="lucide:loader-2" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
                <Icon v-else name="lucide:trash-2" class="w-3.5 h-3.5 mr-1.5" />
                <span>Clear Cache</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent class="p-4 pt-2 space-y-4">
          <!-- Background Task Active Live Banner -->
          <div v-if="prefetchStatus.isRunning" class="p-3.5 rounded-xl bg-indigo-600/15 border border-indigo-500/30 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 font-bold text-indigo-300">
                <Icon name="lucide:loader-2" class="w-4 h-4 animate-spin" />
                <span>Background Email Caching Active...</span>
              </div>
              <div class="text-[11px] text-zinc-400 font-mono">
                {{ prefetchStatus.messagesCached }} emails cached | {{ prefetchStatus.foldersProcessed }} folders
              </div>
            </div>
            <div class="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
              <div class="bg-indigo-500 h-full w-full animate-pulse"></div>
            </div>
          </div>

          <!-- Global Sync & Cache Intervals Configuration -->
          <div class="pt-2 border-t border-zinc-800/60 space-y-3">
            <div class="text-xs font-bold text-white flex items-center gap-1.5">
              <Icon name="lucide:clock" class="w-4 h-4 text-indigo-400" />
              <span>Global Automated Intervals</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Global Email Sync Interval (Sleek CustomSelect) -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">Global Mailbox Sync Interval</label>
                <CustomSelect
                  v-model="selectedEmailSyncInterval"
                  :options="emailSyncIntervalOptions"
                  @change="handleSaveIntervals"
                />
                <p class="text-[11px] text-zinc-500">How often all mailboxes automatically check IMAP for new emails (default: 30 seconds).</p>
              </div>

              <!-- Global Cache Prefetch Interval (Sleek CustomSelect) -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">Offline Cache Prefetch Interval</label>
                <CustomSelect
                  v-model="selectedCachePrefetchInterval"
                  :options="cachePrefetchIntervalOptions"
                  @change="handleSaveIntervals"
                />
                <p class="text-[11px] text-zinc-500">How often the server pre-downloads all message bodies for offline access (default: Never).</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Mailcow Server Configuration Card -->
      <Card class="border-zinc-800 bg-zinc-900 shadow-xl">
        <CardHeader class="pb-3 border-b border-zinc-800/80">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Icon name="lucide:server" class="w-4 h-4" />
            </div>
            <div>
              <CardTitle class="text-base font-bold text-white">Mailcow Integration</CardTitle>
              <CardDescription class="text-xs text-zinc-400">Connect to your Mailcow server API for automated account sync and mailbox provisioning.</CardDescription>
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

      <!-- Connected Email Accounts List Card -->
      <Card class="border-zinc-800 bg-zinc-900 shadow-xl">
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
              acc.visible === false ? 'opacity-50 bg-zinc-950/40 border-zinc-900' : (highlightedAccountId === acc.id ? 'bg-indigo-600/10 border-indigo-500/60 shadow-lg shadow-indigo-500/10' : 'bg-zinc-950 border-zinc-800')
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
                <div class="text-[11px] text-zinc-500 font-mono mt-0.5">
                  IMAP: {{ acc.host }}:{{ acc.port }} | SMTP: {{ acc.smtpHost }}:{{ acc.smtpPort }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Eye Toggle Button to Show / Hide Account in Sidebar -->
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

    <!-- Password Edit Modal -->
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

    <!-- Account Delete Confirmation Modal -->
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
</template>
