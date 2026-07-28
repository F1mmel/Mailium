<script setup lang="ts">
import { ref } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Card from '~/components/ui/card/Card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardContent from '~/components/ui/card/CardContent.vue'

definePageMeta({
  layout: false
})

const username = ref('admin')
const email = ref('')
const password = ref('')
const mailcowHost = ref('')
const mailcowApiKey = ref('')

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleSetup = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter an admin username and password.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res: any = await $fetch('/api/setup', {
      method: 'POST',
      body: {
        username: username.value,
        email: email.value || `${username.value}@localhost`,
        password: password.value,
        mailcowHost: mailcowHost.value ? mailcowHost.value.trim() : undefined,
        mailcowApiKey: mailcowApiKey.value ? mailcowApiKey.value.trim() : undefined
      }
    })

    successMessage.value = 'Setup completed! Initializing system...'
    setTimeout(() => {
      window.location.href = '/'
    }, 1500)
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Setup failed. Please check your credentials.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100 p-4 relative overflow-hidden">
    <!-- Ambient glowing backgrounds -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>

    <Card class="max-w-xl w-full border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
      <div class="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

      <CardHeader class="space-y-2 text-center pb-4">
        <div class="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
          <Icon name="lucide:mail" class="w-6 h-6" />
        </div>
        <CardTitle class="text-2xl font-bold tracking-tight text-white">Welcome to Mailium</CardTitle>
        <CardDescription class="text-zinc-400 text-sm">
          Set up your primary administrator account and optional Mailcow integration.
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-6 pt-2">
        <div v-if="errorMessage" class="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
          <Icon name="lucide:alert-circle" class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <Icon name="lucide:check-circle-2" class="w-4 h-4 shrink-0" />
          <span>{{ successMessage }}</span>
        </div>

        <form @submit.prevent="handleSetup" class="space-y-5">
          <!-- Admin Section -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Icon name="lucide:user-shield" class="w-4 h-4 text-indigo-400" />
              <span>1. Create Admin Account</span>
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-zinc-300">Username</label>
                <Input
                  v-model="username"
                  placeholder="admin"
                  required
                  class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-medium text-zinc-300">Admin Email</label>
                <Input
                  v-model="email"
                  type="email"
                  placeholder="admin@domain.com"
                  class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-zinc-300">Admin Password</label>
              <Input
                v-model="password"
                type="password"
                placeholder="Secure password"
                required
                class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
              />
              <p class="text-[11px] text-zinc-500">Your password will be securely saved in data.json using JWT/Bcrypt hashing.</p>
            </div>
          </div>

          <hr class="border-zinc-800" />

          <!-- Mailcow Section -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Icon name="lucide:server" class="w-4 h-4 text-purple-400" />
              <span>2. Mailcow Server (Optional)</span>
            </h4>

            <div class="space-y-3">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-zinc-300">Mailcow Host</label>
                <Input
                  v-model="mailcowHost"
                  placeholder="mail.yourdomain.com"
                  class="bg-zinc-950/60 border-zinc-800 focus:border-purple-500 text-white"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-medium text-zinc-300">Mailcow API Key</label>
                <Input
                  v-model="mailcowApiKey"
                  type="password"
                  placeholder="API key for automatic mailbox sync"
                  class="bg-zinc-950/60 border-zinc-800 focus:border-purple-500 text-white"
                />
              </div>
            </div>
            <p class="text-[11px] text-zinc-500">If provided, all active Mailcow mailboxes will be automatically added and synced.</p>
          </div>

          <Button
            type="submit"
            class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-2.5 h-auto transition-all shadow-lg shadow-indigo-500/20"
            :disabled="isLoading"
          >
            <Icon v-if="isLoading" name="lucide:loader-2" class="w-4 h-4 animate-spin mr-2" />
            <span>{{ isLoading ? 'Setting up & Syncing...' : 'Initialize System Now' }}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
