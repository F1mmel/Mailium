<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Card from '~/components/ui/card/Card.vue'
import RichTextEditor from '~/components/RichTextEditor.vue'

const props = defineProps<{
  isOpen: boolean
  initialAccountId?: string
  initialTo?: string
  initialSubject?: string
}>()

const emits = defineEmits<{
  (e: 'close'): void
}>()

const { accounts, selectedAccountId } = useEmail()
const toast = useToast()

const selectedSenderKey = ref('') // key format: `${accountId}:${fromEmail}`
const recipients = ref<Array<{ name: string; address: string }>>([])
const toInput = ref('')
const subject = ref('')
const bodyText = ref('')
const isSending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const isToFocused = ref(false)
const senderContacts = ref<Array<{ name: string; address: string }>>([])

// Only accounts that have a password set
const validAccounts = computed(() => {
  return accounts.value.filter(a => a.hasPassword)
})

// The currently active account
const activeAccount = computed(() => {
  const targetId = props.initialAccountId || selectedAccountId.value
  return validAccounts.value.find(a => a.id === targetId) || validAccounts.value[0] || null
})

// Sender options: Primary email + all aliases of ONLY the current active account
const senderOptions = computed(() => {
  if (!activeAccount.value) return []
  const acc = activeAccount.value
  const options: Array<{ key: string; accountId: string; email: string; label: string }> = []

  // Primary email of active account
  options.push({
    key: `${acc.id}:${acc.email}`,
    accountId: acc.id,
    email: acc.email,
    label: acc.email
  })

  // Aliases of ONLY this active account
  if (acc.aliases && Array.isArray(acc.aliases)) {
    acc.aliases.forEach((alias: string) => {
      if (alias && alias.toLowerCase() !== acc.email.toLowerCase()) {
        options.push({
          key: `${acc.id}:${alias}`,
          accountId: acc.id,
          email: alias,
          label: alias
        })
      }
    })
  }

  return options
})

// Modal dirty check: true if recipient, subject, or message body has been entered
const isDirty = computed(() => {
  return recipients.value.length > 0 || toInput.value.trim().length > 0 || subject.value.trim().length > 0 || bodyText.value.trim().length > 0
})

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (senderOptions.value.length > 0) {
      selectedSenderKey.value = senderOptions.value[0].key
    }
    recipients.value = []
    toInput.value = ''
    if (props.initialTo) {
      addRecipientTyped(props.initialTo)
    }
    subject.value = props.initialSubject || ''
    bodyText.value = ''
    errorMessage.value = ''
    successMessage.value = ''
    isToFocused.value = false

    if (activeAccount.value) {
      fetchAccountContacts(activeAccount.value.id)
    }
  }
}, { immediate: true })

const fetchAccountContacts = async (accId: string) => {
  try {
    const data: any = await $fetch('/api/email/contacts', {
      query: { accountId: accId }
    })
    senderContacts.value = data || []
  } catch (e) {
    senderContacts.value = []
  }
}

const filteredContacts = computed(() => {
  if (!toInput.value.trim()) return []
  const q = toInput.value.toLowerCase().trim()
  return senderContacts.value.filter(c =>
    c.address.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q)
  ).slice(0, 5)
})

const addRecipientObj = (contact: { name: string; address: string }) => {
  const cleanAddr = contact.address.trim().replace(/,/g, '')
  if (cleanAddr && !recipients.value.some(r => r.address.toLowerCase() === cleanAddr.toLowerCase())) {
    recipients.value.push({
      name: contact.name || cleanAddr,
      address: cleanAddr
    })
  }
  toInput.value = ''
  isToFocused.value = true
}

const addRecipientTyped = (addr: string) => {
  const cleanAddr = addr.trim().replace(/,/g, '')
  if (!cleanAddr) return
  
  const match = senderContacts.value.find(c => c.address.toLowerCase() === cleanAddr.toLowerCase())
  if (match) {
    addRecipientObj(match)
  } else {
    addRecipientObj({ name: cleanAddr.split('@')[0] || cleanAddr, address: cleanAddr })
  }
}

const removeRecipient = (index: number) => {
  recipients.value.splice(index, 1)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    if (filteredContacts.value.length > 0) {
      addRecipientObj(filteredContacts.value[0])
    } else if (toInput.value.trim().length > 0) {
      addRecipientTyped(toInput.value.trim())
    }
  } else if (e.key === 'Backspace' && toInput.value === '' && recipients.value.length > 0) {
    recipients.value.pop()
  }
}

const getInitials = (name: string, address: string) => {
  const target = (name && name !== address) ? name : address.split('@')[0]
  const parts = target.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return target.substring(0, 2).toUpperCase()
}

const handleSend = async () => {
  if (toInput.value.trim()) {
    addRecipientTyped(toInput.value.trim())
  }

  const [accountId, fromEmail] = selectedSenderKey.value.split(':')
  const targetTo = recipients.value.map(r => r.address).join(', ')

  if (!targetTo || !subject.value.trim()) {
    errorMessage.value = 'Please enter at least one recipient and a subject.'
    toast.error('Validation Error', 'Please enter at least one recipient and a subject.')
    return
  }

  isSending.value = true
  errorMessage.value = ''

  try {
    const plainText = bodyText.value.replace(/<[^>]*>/g, '')
    await $fetch('/api/email/send', {
      method: 'POST',
      body: {
        accountId,
        fromOverride: fromEmail,
        to: targetTo,
        subject: subject.value,
        text: plainText,
        html: bodyText.value
      }
    })
    successMessage.value = 'Email sent successfully!'
    toast.success('Email Sent', `Message to ${targetTo} was delivered.`)
    setTimeout(() => {
      emits('close')
    }, 800)
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Failed to send email.'
    errorMessage.value = msg
    toast.error('Send Failed', msg)
  } finally {
    isSending.value = false
  }
}

const closeDropdownIfOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#to-input-container')) {
    isToFocused.value = false
  }
}

const handleBackdropClick = (e: MouseEvent) => {
  closeDropdownIfOutside(e)
  if (!isDirty.value) {
    emits('close')
  }
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="isOpen"
      @click.self="handleBackdropClick"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none"
    >
      <Card class="w-full max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div class="flex items-center gap-2">
            <Icon name="lucide:pen-square" class="w-5 h-5 text-indigo-400" />
            <h2 class="font-bold text-sm text-white">New Message</h2>
          </div>
          <button @click="$emit('close')" class="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1">
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>

        <!-- Form Content -->
        <div class="p-4 space-y-3.5 flex-1 overflow-y-auto" @click="closeDropdownIfOutside">
          <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs">
            {{ errorMessage }}
          </div>
          <div v-if="successMessage" class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 text-xs">
            {{ successMessage }}
          </div>

          <!-- From Sender Address Dropdown (Only Primary + Aliases of Active Account) -->
          <div class="flex items-center gap-3 text-xs border-b border-zinc-800/60 pb-2">
            <span class="w-12 text-zinc-400 shrink-0 font-semibold font-mono">From:</span>
            <select
              v-model="selectedSenderKey"
              class="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option v-for="opt in senderOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- To Recipients Pill Input with Auto-Suggestions -->
          <div id="to-input-container" class="relative flex items-center gap-3 text-xs border-b border-zinc-800/60 pb-2">
            <span class="w-12 text-zinc-400 shrink-0 font-semibold font-mono">To:</span>
            
            <div class="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px] bg-zinc-900 border border-zinc-800 rounded-md p-1.5 focus-within:border-indigo-500 transition-colors">
              <span
                v-for="(r, idx) in recipients"
                :key="r.address"
                class="inline-flex items-center gap-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md text-xs font-medium"
              >
                <span>{{ r.name }}</span>
                <span class="text-[10px] text-indigo-400 font-mono">&lt;{{ r.address }}&gt;</span>
                <button type="button" @click="removeRecipient(idx)" class="hover:text-red-400 ml-0.5 cursor-pointer">
                  <Icon name="lucide:x" class="w-3 h-3" />
                </button>
              </span>

              <input
                v-model="toInput"
                @focus="isToFocused = true"
                @keydown="handleKeydown"
                placeholder="Type name or email address..."
                class="flex-1 min-w-[160px] bg-transparent text-xs text-white focus:outline-none px-1"
              />
            </div>

            <!-- Auto-Suggestion Dropdown Popup -->
            <Transition name="modal-fade">
              <div
                v-if="isToFocused && filteredContacts.length > 0"
                class="absolute left-15 right-0 top-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-zinc-800/60"
              >
                <div
                  v-for="contact in filteredContacts"
                  :key="contact.address"
                  @mousedown.prevent="addRecipientObj(contact)"
                  class="p-2.5 hover:bg-indigo-600/20 cursor-pointer flex items-center gap-2.5 transition-colors group"
                >
                  <div class="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                    {{ getInitials(contact.name, contact.address) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-white group-hover:text-indigo-200 truncate">{{ contact.name }}</div>
                    <div class="text-[10px] text-zinc-400 truncate">{{ contact.address }}</div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Subject Field -->
          <div class="flex items-center gap-3 text-xs border-b border-zinc-800/60 pb-2">
            <span class="w-12 text-zinc-400 shrink-0 font-semibold font-mono">Subject:</span>
            <Input
              v-model="subject"
              placeholder="Email subject..."
              class="flex-1 bg-zinc-900 border-zinc-800 text-xs h-8 text-white focus:border-indigo-500"
            />
          </div>

          <!-- RichText Message Editor (Tiptap with image & formatting tools) -->
          <div class="space-y-1 pt-1">
            <RichTextEditor
              v-model="bodyText"
              placeholder="Write your email message here..."
            />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div class="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
            <Icon name="lucide:paperclip" class="w-3.5 h-3.5 text-zinc-400" />
            <span>Base64 images & RichText supported</span>
          </div>

          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" @click="$emit('close')" class="text-xs">
              Cancel
            </Button>
            <Button
              @click="handleSend"
              :disabled="isSending"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4"
            >
              <Icon v-if="isSending" name="lucide:loader-2" class="w-4 h-4 mr-1.5 animate-spin" />
              <Icon v-else name="lucide:send" class="w-4 h-4 mr-1.5" />
              <span>Send Message</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </Transition>
</template>
