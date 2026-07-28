<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmailSidebar from '~/components/EmailSidebar.vue'
import MailInbox from '~/components/MailInbox.vue'
import ComposeModal from '~/components/ComposeModal.vue'
import PasswordModal from '~/components/PasswordModal.vue'
import PwaInstallPrompt from '~/components/PwaInstallPrompt.vue'

const route = useRoute()
const router = useRouter()
const mailInboxRef = ref<any | null>(null)

const {
  accounts,
  selectedAccountId,
  fetchAccounts,
  fetchFolders,
  initGlobalPush,
  syncAccount,
  checkAccountPassword,
  isPasswordModalOpen,
  accountNeedingPassword
} = useEmail()

const selectedFolder = ref('INBOX')
const selectedMessageId = ref<string | null>(null)
const isComposeOpen = ref(false)
const composeInitialTo = ref('')
const composeInitialSubject = ref('')

const syncQueryParams = () => {
  if (!process.client || !selectedAccountId.value) return
  const acc = accounts.value.find(a => a.id === selectedAccountId.value)
  const accountQuery = acc ? acc.email : selectedAccountId.value
  const folderQuery = selectedFolder.value || 'INBOX'
  const messageQuery = selectedMessageId.value || undefined

  if (route.query.account !== accountQuery || route.query.folder !== folderQuery || route.query.messageId !== messageQuery) {
    router.replace({
      query: {
        ...route.query,
        account: accountQuery,
        folder: folderQuery,
        messageId: messageQuery
      }
    })
  }
}

onMounted(async () => {
  if (process.client) {
    initGlobalPush()
    await fetchAccounts()

    // Read initial URL query params if present
    const qAccount = route.query.account as string
    const qFolder = route.query.folder as string
    const qMessageId = route.query.messageId as string

    if (qAccount && accounts.value.length > 0) {
      const found = accounts.value.find(a => a.email.toLowerCase() === qAccount.toLowerCase() || a.id === qAccount)
      if (found) {
        selectedAccountId.value = found.id
      }
    }

    if (qFolder) {
      selectedFolder.value = qFolder
    }

    if (qMessageId) {
      selectedMessageId.value = qMessageId
    }

    if (selectedAccountId.value) {
      if (checkAccountPassword(selectedAccountId.value)) {
        await fetchFolders(selectedAccountId.value)
      }
    }

    syncQueryParams()
  }
})

watch([selectedAccountId, selectedFolder, selectedMessageId], () => {
  syncQueryParams()
})

const handleSelectAccount = (id: string) => {
  selectedFolder.value = 'INBOX'
  selectedMessageId.value = null
  checkAccountPassword(id)
}

const handleSelectFolder = (folderPath: string) => {
  if (checkAccountPassword(selectedAccountId.value)) {
    selectedFolder.value = folderPath
    selectedMessageId.value = null
  }
}

const handleSelectMessage = (msgId: string | null) => {
  selectedMessageId.value = msgId
}

const openComposeNew = () => {
  composeInitialTo.value = ''
  composeInitialSubject.value = ''
  isComposeOpen.value = true
}

const handleReplyMail = (data: { to: string; subject: string }) => {
  composeInitialTo.value = data.to
  composeInitialSubject.value = data.subject
  isComposeOpen.value = true
}

const handleForwardMail = (data: { subject: string }) => {
  composeInitialTo.value = ''
  composeInitialSubject.value = data.subject
  isComposeOpen.value = true
}

const handleMoveEmails = (payload: { accountId: string; uids: string[]; targetFolder: string }) => {
  if (mailInboxRef.value) {
    mailInboxRef.value.moveSpecificMessages(payload.uids, payload.targetFolder)
  }
}
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden bg-zinc-950 text-zinc-100 antialiased font-sans">
    <!-- Sidebar -->
    <EmailSidebar
      :selectedFolder="selectedFolder"
      @select-account="handleSelectAccount"
      @select-folder="handleSelectFolder"
      @open-compose="openComposeNew"
      @move-emails="handleMoveEmails"
    />

    <!-- Main Inbox Interface -->
    <MailInbox
      ref="mailInboxRef"
      :accountId="selectedAccountId"
      :folderPath="selectedFolder"
      :initialMessageId="selectedMessageId || undefined"
      @select-message="handleSelectMessage"
      @reply-mail="handleReplyMail"
      @forward-mail="handleForwardMail"
    />

    <!-- Compose Modal -->
    <ComposeModal
      :isOpen="isComposeOpen"
      :initialAccountId="selectedAccountId || undefined"
      :initialTo="composeInitialTo"
      :initialSubject="composeInitialSubject"
      @close="isComposeOpen = false"
    />

    <!-- Account Password Entry Modal -->
    <PasswordModal
      :isOpen="isPasswordModalOpen"
      :account="accountNeedingPassword"
      @close="isPasswordModalOpen = false"
    />

    <!-- iOS Home Screen & Push Notification Prompt -->
    <PwaInstallPrompt />
  </div>
</template>
