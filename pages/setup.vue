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

const currentStep = ref(1)

const username = ref('admin')
const email = ref('')
const password = ref('')
const mailcowHost = ref('')
const mailcowApiKey = ref('')

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const goToStep2 = () => {
  errorMessage.value = ''
  if (!username.value.trim()) {
    errorMessage.value = 'Please enter an admin username.'
    return
  }
  if (!email.value.trim()) {
    errorMessage.value = 'Please enter an admin email address.'
    return
  }
  if (!password.value) {
    errorMessage.value = 'Please enter an admin password.'
    return
  }
  currentStep.value = 2
}

const goToStep1 = () => {
  errorMessage.value = ''
  currentStep.value = 1
}

const handleSetup = async () => {
  errorMessage.value = ''

  if (!mailcowHost.value.trim() || !mailcowApiKey.value.trim()) {
    errorMessage.value = 'Mailcow Host and API Key are required.'
    return
  }

  isLoading.value = true
  successMessage.value = ''

  try {
    const res: any = await $fetch('/api/setup', {
      method: 'POST',
      body: {
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value,
        mailcowHost: mailcowHost.value.trim(),
        mailcowApiKey: mailcowApiKey.value.trim()
      }
    })

    successMessage.value = 'Setup completed successfully! Redirecting...'
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
    <!-- Ambient glowing background effects -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

    <Card class="max-w-xl w-full border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
      <div class="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

      <CardHeader class="space-y-3 text-center pb-2">
        <div class="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Icon name="lucide:mail" class="w-6 h-6" />
        </div>
        <CardTitle class="text-2xl font-bold tracking-tight text-white">Welcome to Mailium</CardTitle>
        <CardDescription class="text-zinc-400 text-sm">
          Set up your primary administrator account and connect your Mailcow server.
        </CardDescription>

        <!-- Wizard Step Indicator (Status Display) -->
        <div class="flex items-center justify-center gap-3 pt-2">
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            :class="currentStep === 1 ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300' : 'bg-zinc-800/60 text-zinc-500'"
          >
            <span class="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Admin Account</span>
          </div>

          <div class="w-8 h-px bg-zinc-800"></div>

          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            :class="currentStep === 2 ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' : 'bg-zinc-800/60 text-zinc-500'"
          >
            <span class="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Mailcow Server</span>
          </div>
        </div>
      </CardHeader>

      <CardContent class="space-y-6 pt-4">
        <!-- Error & Success Messages -->
        <div v-if="errorMessage" class="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
          <Icon name="lucide:alert-circle" class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <Icon name="lucide:check-circle-2" class="w-4 h-4 shrink-0" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- STEP 1: Admin Account -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="space-y-1">
            <h4 class="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Icon name="lucide:user-shield" class="w-4 h-4 text-indigo-400" />
              <span>Step 1: Create Admin Account</span>
            </h4>
            <p class="text-xs text-zinc-400">Set up your primary administrator credentials for Mailium.</p>
          </div>

          <div class="space-y-3 pt-1">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-zinc-300">Username <span class="text-red-400">*</span></label>
              <Input
                v-model="username"
                placeholder="admin"
                required
                class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-zinc-300">Admin Email <span class="text-red-400">*</span></label>
              <Input
                v-model="email"
                type="email"
                placeholder="admin@domain.com"
                required
                class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-zinc-300">Admin Password <span class="text-red-400">*</span></label>
              <Input
                v-model="password"
                type="password"
                placeholder="Secure password"
                required
                class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
              />
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <Button
              type="button"
              @click="goToStep2"
              class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
            >
              <span>Continue to Mailcow</span>
              <Icon name="lucide:arrow-right" class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <!-- STEP 2: Mailcow Server (Mandatory) -->
        <div v-if="currentStep === 2" class="space-y-4">
          <div class="space-y-1">
            <h4 class="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Icon name="lucide:server" class="w-4 h-4 text-purple-400" />
              <span>Step 2: Connect Mailcow Server</span>
            </h4>
            <p class="text-xs text-zinc-400">Mailcow integration is required. Enter your server credentials to sync mailboxes.</p>
          </div>

          <div class="space-y-3 pt-1">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-zinc-300">Mailcow Host <span class="text-red-400">*</span></label>
              <Input
                v-model="mailcowHost"
                placeholder="mail.yourdomain.com"
                required
                class="bg-zinc-950/60 border-zinc-800 focus:border-purple-500 text-white"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-zinc-300">Mailcow API Key <span class="text-red-400">*</span></label>
              <Input
                v-model="mailcowApiKey"
                type="password"
                placeholder="API key for automatic mailbox sync"
                required
                class="bg-zinc-950/60 border-zinc-800 focus:border-purple-500 text-white"
              />
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              @click="goToStep1"
              class="border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center gap-2"
            >
              <Icon name="lucide:arrow-left" class="w-4 h-4" />
              <span>Back to Admin Account</span>
            </Button>

            <Button
              type="button"
              @click="handleSetup"
              class="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-5 py-2 flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20"
              :disabled="isLoading"
            >
              <Icon v-if="isLoading" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <span>{{ isLoading ? 'Setting up & Syncing...' : 'Initialize System Now' }}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
