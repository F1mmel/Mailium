<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Badge from '~/components/ui/badge/Badge.vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import AccountContextMenu from '~/components/AccountContextMenu.vue'
import FolderContextMenu from '~/components/FolderContextMenu.vue'

const props = defineProps<{
  selectedFolder?: string
}>()

const emits = defineEmits<{
  (e: 'select-account', accountId: string): void
  (e: 'select-folder', folderPath: string): void
  (e: 'open-compose'): void
  (e: 'move-emails', payload: { accountId: string; uids: string[]; targetFolder: string }): void
}>()

const {
  accounts,
  selectedAccountId,
  folders,
  fetchAccounts,
  fetchFolders,
  createFolder,
  syncAccount,
  isSyncing,
  totalUnreadCount,
  checkAccountPassword
} = useEmail()

const { customization, fetchCustomization } = useCustomization()
const { logout } = useAuth()
const toast = useToast()

const collapsedAccounts = ref<Record<string, boolean>>({})
const dragOverFolder = ref<string | null>(null)

// Create Folder Modal State
const isCreateFolderModalOpen = ref(false)
const createFolderAccountId = ref<string | null>(null)
const newFolderName = ref('')
const isCreatingFolder = ref(false)

// Account Right-Click Context Menu State
const isAccountContextMenuOpen = ref(false)
const accountContextMenuPos = ref({ x: 0, y: 0 })
const accountContextMenuAcc = ref<any | null>(null)

// Folder Right-Click Context Menu State
const isFolderContextMenuOpen = ref(false)
const folderContextMenuPos = ref({ x: 0, y: 0 })
const folderContextMenuAccId = ref<string | null>(null)
const folderContextMenuFolder = ref<any | null>(null)

// Folder Rename Modal State
const isRenameFolderModalOpen = ref(false)
const renameFolderAccountId = ref<string | null>(null)
const renameFolderOldPath = ref('')
const renameFolderNewName = ref('')
const isRenamingFolder = ref(false)

// Folder Delete Modal State
const isDeleteFolderModalOpen = ref(false)
const deleteFolderAccountId = ref<string | null>(null)
const deleteFolderPath = ref('')
const isDeletingFolder = ref(false)

onMounted(async () => {
  fetchCustomization()
  await fetchAccounts()
  if (accounts.value.length > 0) {
    accounts.value.forEach(acc => {
      if (acc.hasPassword) {
        fetchFolders(acc.id)
      }
    })
  }
})

// Auto-fetch folders when accounts change or load
watch(accounts, (newAccs) => {
  if (newAccs && newAccs.length > 0) {
    newAccs.forEach(acc => {
      if (acc.hasPassword && (!folders.value[acc.id] || folders.value[acc.id].length === 0)) {
        fetchFolders(acc.id)
      }
    })
  }
}, { immediate: true })

// Expand selected account by default
watch(selectedAccountId, (newId) => {
  if (newId) {
    collapsedAccounts.value[newId] = false
    if (checkAccountPassword(newId) && (!folders.value[newId] || folders.value[newId].length === 0)) {
      fetchFolders(newId)
    }
  }
}, { immediate: true })

const isCollapsed = (accountId: string) => {
  if (collapsedAccounts.value[accountId] === undefined) {
    return accountId !== selectedAccountId.value
  }
  return collapsedAccounts.value[accountId]
}

const toggleAccount = (acc: any) => {
  selectedAccountId.value = acc.id
  emits('select-account', acc.id)

  if (!acc.hasPassword) {
    checkAccountPassword(acc.id)
    return
  }

  collapsedAccounts.value[acc.id] = !isCollapsed(acc.id)

  if (!folders.value[acc.id] || folders.value[acc.id].length === 0) {
    fetchFolders(acc.id)
  }
}

const handleAccountContextMenu = (e: MouseEvent, acc: any) => {
  e.preventDefault()
  e.stopPropagation()
  accountContextMenuPos.value = { x: e.clientX, y: e.clientY }
  accountContextMenuAcc.value = acc
  isAccountContextMenuOpen.value = true
}

const handleFolderRightClick = (e: MouseEvent, accountId: string, folder: any) => {
  e.preventDefault()
  e.stopPropagation()

  // If folder is INBOX, do NOT open context menu at all
  const folderName = (folder?.path || folder?.name || '').toUpperCase()
  if (folderName === 'INBOX' || folderName.endsWith('/INBOX')) {
    return
  }

  folderContextMenuPos.value = { x: e.clientX, y: e.clientY }
  folderContextMenuAccId.value = accountId
  folderContextMenuFolder.value = folder
  isFolderContextMenuOpen.value = true
}

const handleOpenRenameFolderModal = ({ accountId, folder }: { accountId: string; folder: any }) => {
  renameFolderAccountId.value = accountId
  renameFolderOldPath.value = folder.path
  renameFolderNewName.value = folder.name
  isRenameFolderModalOpen.value = true
}

const handleOpenDeleteFolderModal = ({ accountId, folder }: { accountId: string; folder: any }) => {
  deleteFolderAccountId.value = accountId
  deleteFolderPath.value = folder.path
  isDeleteFolderModalOpen.value = true
}

const handleRenameFolderSubmit = async () => {
  if (!renameFolderAccountId.value || !renameFolderOldPath.value || !renameFolderNewName.value.trim()) return
  isRenamingFolder.value = true
  const newName = renameFolderNewName.value.trim()
  try {
    await $fetch('/api/email/folder/rename', {
      method: 'POST',
      body: {
        accountId: renameFolderAccountId.value,
        oldPath: renameFolderOldPath.value,
        newPath: newName
      }
    })
    toast.success('Folder Renamed', `Folder was renamed to "${newName}".`)
    isRenameFolderModalOpen.value = false
    await fetchFolders(renameFolderAccountId.value, true)
    if (props.selectedFolder === renameFolderOldPath.value) {
      emits('select-folder', newName)
    }
  } catch (e: any) {
    toast.error('Rename Failed', e.data?.message || 'Could not rename folder.')
  } finally {
    isRenamingFolder.value = false
  }
}

const handleDeleteFolderSubmit = async () => {
  if (!deleteFolderAccountId.value || !deleteFolderPath.value) return
  isDeletingFolder.value = true
  const path = deleteFolderPath.value
  try {
    await $fetch('/api/email/folder/delete', {
      method: 'POST',
      body: {
        accountId: deleteFolderAccountId.value,
        folderPath: path
      }
    })
    toast.success('Folder Deleted', `Folder "${path}" was deleted.`)
    isDeleteFolderModalOpen.value = false
    await fetchFolders(deleteFolderAccountId.value, true)
    if (props.selectedFolder === path) {
      emits('select-folder', 'INBOX')
    }
  } catch (e: any) {
    toast.error('Delete Failed', e.data?.message || 'Could not delete folder.')
  } finally {
    isDeletingFolder.value = false
  }
}

const handleOpenAccountSettings = (accountId: string) => {
  navigateTo({
    path: '/settings/accounts',
    query: { id: accountId }
  })
}

const handleHideAccount = async (accountId: string) => {
  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: { id: accountId, visible: false }
    })
    toast.info('Account Hidden', 'Account hidden from sidebar. Re-enable in Settings.')
    await fetchAccounts()
    if (accounts.value.length > 0) {
      const firstAcc = accounts.value[0]
      selectedAccountId.value = firstAcc.id
      emits('select-account', firstAcc.id)
    }
  } catch (err: any) {
    toast.error('Hide Failed', err?.message || 'Could not hide account')
  }
}

const handleClearAccountPassword = async (accountId: string) => {
  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: { id: accountId, clearPassword: true }
    })
    toast.warning('Password Cleared', 'Access revoked. You will be prompted for a password when accessing this mailbox.')
    await fetchAccounts()
    if (accounts.value.length > 0) {
      const firstAcc = accounts.value[0]
      selectedAccountId.value = firstAcc.id
      emits('select-account', firstAcc.id)
    }
  } catch (err: any) {
    toast.error('Failed to clear password', err?.message || 'Could not clear password')
  }
}

const openCreateFolderModal = (accountId: string, e: Event) => {
  e.stopPropagation()
  if (!checkAccountPassword(accountId)) return
  createFolderAccountId.value = accountId
  newFolderName.value = ''
  isCreateFolderModalOpen.value = true
}

const handleCreateFolderSubmit = async () => {
  if (!createFolderAccountId.value || !newFolderName.value.trim()) return
  const folderName = newFolderName.value.trim()
  isCreatingFolder.value = true
  try {
    await createFolder(createFolderAccountId.value, folderName)
    toast.success('Folder Created', `Folder "${folderName}" created successfully.`)
    isCreateFolderModalOpen.value = false
    newFolderName.value = ''
  } catch (err: any) {
    toast.error('Folder Creation Failed', err?.message || 'Failed to create folder')
  } finally {
    isCreatingFolder.value = false
  }
}

const selectFolder = (accountId: string, folderPath: string) => {
  selectedAccountId.value = accountId
  emits('select-account', accountId)
  emits('select-folder', folderPath)
}

const getFolderIcon = (path: string, name: string) => {
  const n = name.toLowerCase()
  if (n === 'inbox' || path === 'INBOX') return 'lucide:inbox'
  if (n.includes('sent') || n.includes('gesendet')) return 'lucide:send'
  if (n.includes('draft') || n.includes('entwurf')) return 'lucide:file-text'
  if (n.includes('trash') || n.includes('papierkorb')) return 'lucide:trash-2'
  if (n.includes('junk') || n.includes('spam')) return 'lucide:shield-alert'
  if (n.includes('archive') || n.includes('archiv')) return 'lucide:archive'
  return 'lucide:folder'
}

// Drag and Drop handlers
const handleDragOver = (e: DragEvent, folderPath: string) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverFolder.value = folderPath
}

const handleDragLeave = (folderPath: string) => {
  if (dragOverFolder.value === folderPath) {
    dragOverFolder.value = null
  }
}

const handleDrop = (e: DragEvent, accountId: string, targetFolder: string) => {
  e.preventDefault()
  dragOverFolder.value = null
  try {
    const rawData = e.dataTransfer?.getData('application/json') || e.dataTransfer?.getData('text/plain')
    if (!rawData) return
    const payload = JSON.parse(rawData)
    if (payload && payload.uids && payload.uids.length > 0) {
      emits('move-emails', {
        accountId: payload.accountId || accountId,
        uids: payload.uids,
        targetFolder
      })
    }
  } catch (err) {
    console.error('Drag and drop error:', err)
  }
}
</script>

<template>
  <aside class="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full max-h-screen overflow-hidden shrink-0 select-none">
    <!-- Sidebar Header -->
    <div class="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950">
      <div class="flex items-center gap-2.5">
        <div class="w-8.5 h-8.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Icon name="lucide:mail" class="w-4.5 h-4.5" />
        </div>
        <div>
          <h1 class="font-bold text-base text-white tracking-tight leading-tight">{{ customization.appName || 'Mailium' }}</h1>
          <p class="text-xs text-zinc-500 font-mono">{{ totalUnreadCount }} unread</p>
        </div>
      </div>

      <!-- Sync Button -->
      <button
        @click="syncAccount()"
        :disabled="isSyncing"
        class="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
        title="Sync All Accounts"
      >
        <Icon name="lucide:refresh-cw" :class="['w-4 h-4 inline-block', isSyncing ? 'animate-spin text-indigo-400' : '']" />
      </button>
    </div>

    <!-- Compose Button (Styled like Dark Mail pill button with rich hover effects) -->
    <div class="p-3 border-b border-zinc-800/60 shrink-0 bg-zinc-950">
      <button
        @click="$emit('open-compose')"
        class="w-full bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 hover:border-indigo-500/70 text-indigo-300 hover:text-white font-semibold text-xs h-9.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/25 cursor-pointer group"
      >
        <Icon name="lucide:pen-square" class="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
        <span>Compose Email</span>
      </button>
    </div>

    <!-- Collapsible Accounts & Folder Tree -->
    <div class="flex-1 overflow-y-auto px-2 py-2.5 space-y-2 min-h-0">
      <div v-for="acc in accounts" :key="acc.id" class="space-y-0.5">
        <!-- Account Header Button with Right-Click Context Menu Support & Accent Account Name -->
        <div
          @click="toggleAccount(acc)"
          @contextmenu.prevent="handleAccountContextMenu($event, acc)"
          :class="[
            'w-full flex items-center justify-between px-2 py-2 rounded-xl transition-all text-left cursor-pointer border group/acc',
            selectedAccountId === acc.id ? 'bg-zinc-900 border-zinc-800' : 'border-transparent hover:bg-zinc-900/60'
          ]"
        >
          <div class="flex items-center gap-2 truncate pr-1 flex-1 min-w-0">
            <Icon
              name="lucide:chevron-right"
              :class="[
                'w-4 h-4 text-zinc-400 transition-transform duration-300 shrink-0',
                !isCollapsed(acc.id) ? 'rotate-90 text-indigo-400' : ''
              ]"
            />

            <div class="truncate">
              <!-- Account Name in Accent Color -->
              <div class="font-bold text-sm truncate text-indigo-300 group-hover/acc:text-indigo-200 flex items-center gap-1.5">
                <span>{{ acc.name }}</span>
                <span v-if="!acc.hasPassword" title="Password required" class="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block shrink-0"></span>
              </div>
              <div class="text-xs text-zinc-400 truncate mt-0.5">{{ acc.email }}</div>
            </div>
          </div>

          <!-- Create New Folder Icon Button -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click.stop="openCreateFolderModal(acc.id, $event)"
              class="p-1 rounded-md text-zinc-400 hover:text-indigo-300 hover:bg-indigo-600/20 opacity-0 group-hover/acc:opacity-100 transition-all cursor-pointer"
              title="Create new folder"
            >
              <Icon name="lucide:folder-plus" class="w-4 h-4" />
            </button>

            <Icon v-if="!acc.hasPassword" name="lucide:key-round" class="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        </div>

        <!-- Animated Collapsible Folder Structure -->
        <div
          :class="[
            'overflow-hidden transition-all duration-300 ease-in-out pl-3 space-y-0.5',
            isCollapsed(acc.id) ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[1000px] opacity-100 py-0.5'
          ]"
        >
          <div v-if="!acc.hasPassword" class="px-2 py-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1.5">
            <Icon name="lucide:key-round" class="w-4 h-4 shrink-0" />
            <span>Click to set password</span>
          </div>

          <div v-else-if="!folders[acc.id] || folders[acc.id].length === 0" class="px-2 py-1.5 text-xs text-zinc-500 flex items-center gap-1.5">
            <Icon name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
            <span>Loading folders...</span>
          </div>

          <button
            v-else
            v-for="folder in folders[acc.id]"
            :key="folder.path"
            @click="selectFolder(acc.id, folder.path)"
            @contextmenu.prevent.stop="handleFolderRightClick($event, acc.id, folder)"
            @dragover="handleDragOver($event, folder.path)"
            @dragleave="handleDragLeave(folder.path)"
            @drop="handleDrop($event, acc.id, folder.path)"
            :class="[
              'w-full flex items-center justify-between px-2 py-1 rounded-lg text-sm transition-all cursor-pointer border font-medium',
              dragOverFolder === folder.path ? 'bg-indigo-600/30 border-indigo-500 text-white scale-[1.02] shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500' : (selectedAccountId === acc.id && selectedFolder === folder.path ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-indigo-500/30' : 'border-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white')
            ]"
          >
            <div class="flex items-center gap-2 truncate">
              <Icon :name="getFolderIcon(folder.path, folder.name)" class="w-4 h-4 shrink-0 text-zinc-400" />
              <span class="truncate">{{ (folder.name || '').toUpperCase() === 'INBOX' ? 'Inbox' : folder.name }}</span>
            </div>

            <Badge v-if="folder.unseen && folder.unseen > 0" variant="secondary" class="bg-indigo-500/20 text-indigo-300 text-[11px] h-4.5 px-1.5 font-bold">
              {{ folder.unseen }}
            </Badge>
          </button>
        </div>
      </div>
    </div>

    <!-- Footer / Settings & Logout -->
    <div class="p-3 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/95 gap-1 shrink-0 mt-auto">
      <NuxtLink to="/settings/accounts" class="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors shrink-0">
        <Icon name="lucide:settings" class="w-4 h-4" />
        <span>Settings</span>
      </NuxtLink>

      <div class="flex items-center gap-1.5 shrink-0">
        <!-- Customization Palette Button (Navigates to /settings/customization) -->
        <NuxtLink
          to="/settings/customization"
          class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          title="Appearance & Customization"
        >
          <Icon name="lucide:palette" class="w-4 h-4" />
        </NuxtLink>

        <button @click="logout" title="Sign Out" class="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-zinc-900 transition-colors cursor-pointer shrink-0">
          <Icon name="lucide:log-out" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Account Context Menu -->
    <AccountContextMenu
      :isOpen="isAccountContextMenuOpen"
      :x="accountContextMenuPos.x"
      :y="accountContextMenuPos.y"
      :account="accountContextMenuAcc"
      @close="isAccountContextMenuOpen = false"
      @open-settings="handleOpenAccountSettings"
      @hide-account="handleHideAccount"
      @clear-password="handleClearAccountPassword"
    />

    <!-- Folder Context Menu -->
    <FolderContextMenu
      :isOpen="isFolderContextMenuOpen"
      :x="folderContextMenuPos.x"
      :y="folderContextMenuPos.y"
      :accountId="folderContextMenuAccId"
      :folder="folderContextMenuFolder"
      @close="isFolderContextMenuOpen = false"
      @rename-folder="handleOpenRenameFolderModal"
      @delete-folder="handleOpenDeleteFolderModal"
    />

    <!-- Create New Folder Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="isCreateFolderModalOpen"
          @click.self="isCreateFolderModalOpen = false"
          class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            @click.stop
            class="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 cursor-default"
          >
            <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div class="flex items-center gap-2">
                <Icon name="lucide:folder-plus" class="w-5 h-5 text-indigo-400" />
                <h3 class="font-bold text-sm text-white">Create New Folder</h3>
              </div>
              <button @click="isCreateFolderModalOpen = false" class="text-zinc-400 hover:text-white p-1 cursor-pointer">
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <form @submit.prevent="handleCreateFolderSubmit" class="space-y-3">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-zinc-400">Folder Name</label>
                <Input
                  v-model="newFolderName"
                  placeholder="e.g. Invoices, Project X"
                  required
                  autofocus
                  class="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" @click="isCreateFolderModalOpen = false" class="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" :disabled="isCreatingFolder || !newFolderName.trim()" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  <Icon v-if="isCreatingFolder" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Create Folder</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Rename Folder Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="isRenameFolderModalOpen"
          @click.self="isRenameFolderModalOpen = false"
          class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            @click.stop
            class="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 cursor-default"
          >
            <div class="flex items-center gap-2 text-white font-bold text-sm">
              <Icon name="lucide:edit-3" class="w-4 h-4 text-indigo-400" />
              <span>Rename Folder</span>
            </div>

            <form @submit.prevent="handleRenameFolderSubmit" class="space-y-3">
              <div class="space-y-1">
                <label class="text-xs text-zinc-400 font-medium">New Folder Name</label>
                <Input
                  v-model="renameFolderNewName"
                  placeholder="Folder name..."
                  required
                  autofocus
                  class="bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                />
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" @click="isRenameFolderModalOpen = false" class="text-xs">
                  Cancel
                </Button>
                <Button size="sm" type="submit" :disabled="isRenamingFolder" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  <Icon v-if="isRenamingFolder" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Save Name</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Folder Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="isDeleteFolderModalOpen"
          @click.self="isDeleteFolderModalOpen = false"
          class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            @click.stop
            class="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 cursor-default"
          >
            <div class="flex items-center gap-3 text-rose-400">
              <div class="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Icon name="lucide:trash-2" class="w-5 h-5" />
              </div>
              <div>
                <h3 class="font-bold text-sm text-white">Delete Folder?</h3>
                <p class="text-xs text-zinc-400">This will remove the folder from IMAP.</p>
              </div>
            </div>

            <p class="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong class="text-white">{{ deleteFolderPath }}</strong>? All messages in this folder will be lost.
            </p>

            <div class="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" @click="isDeleteFolderModalOpen = false" class="text-xs">
                Cancel
              </Button>
              <Button
                @click="handleDeleteFolderSubmit"
                size="sm"
                :disabled="isDeletingFolder"
                class="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                <Icon v-if="isDeletingFolder" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>Delete Folder</span>
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>
