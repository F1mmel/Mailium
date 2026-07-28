<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Card from '~/components/ui/card/Card.vue'

const props = defineProps<{
  isOpen: boolean
  account?: any
}>()

const emits = defineEmits<{
  (e: 'close'): void
  (e: 'saved', password: string): void
}>()

const passwordInput = ref('')
const passwordInputRef = ref<any | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref('')

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    passwordInput.value = ''
    errorMessage.value = ''
    nextTick(() => {
      if (passwordInputRef.value) {
        if (typeof passwordInputRef.value.focus === 'function') {
          passwordInputRef.value.focus()
        } else if (passwordInputRef.value.$el && typeof passwordInputRef.value.$el.focus === 'function') {
          passwordInputRef.value.$el.focus()
        }
      }
    })
  }
})

const handleSubmit = async () => {
  if (!passwordInput.value || !props.account) {
    errorMessage.value = 'Please enter a password.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/email/account/update', {
      method: 'PUT',
      body: {
        id: props.account.id,
        password: passwordInput.value
      }
    })

    emits('saved', passwordInput.value)
    emits('close')
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Failed to save password.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="isOpen && account"
      @click.self="$emit('close')"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <Card @click.stop class="max-w-md w-full border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl overflow-hidden cursor-default">
        <div class="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500"></div>

        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Icon name="lucide:key-round" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-bold text-base text-white">Password Required</h3>
              <p class="text-xs text-zinc-400">
                Please enter the IMAP/SMTP password for <strong class="text-zinc-200">{{ account.email }}</strong>.
              </p>
            </div>
          </div>

          <div v-if="errorMessage" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {{ errorMessage }}
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4 pt-1">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-zinc-300">Mailbox Password</label>
              <Input
                ref="passwordInputRef"
                v-model="passwordInput"
                type="password"
                placeholder="••••••••"
                required
                autofocus
                class="bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" @click="$emit('close')">
                Cancel
              </Button>
              <Button type="submit" size="sm" :disabled="isSubmitting" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                <Icon v-if="isSubmitting" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{{ isSubmitting ? 'Saving...' : 'Save & Sync' }}</span>
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  </Transition>
</template>
