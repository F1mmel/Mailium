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

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const { login } = useAuth()

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMessage.value = 'Please enter your username and password.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await login({ username: username.value, password: password.value })
    navigateTo('/')
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Authentication failed.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100 p-4 relative overflow-hidden">
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

    <Card class="max-w-md w-full border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl relative z-10">
      <CardHeader class="space-y-1 text-center">
        <div class="mx-auto w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
          <Icon name="lucide:lock" class="w-6 h-6" />
        </div>
        <CardTitle class="text-xl font-bold text-white">Sign In to Mailium</CardTitle>
        <CardDescription class="text-zinc-400 text-xs">
          Enter your credentials to access your email accounts.
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <div v-if="errorMessage" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <Icon name="lucide:alert-circle" class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-zinc-300">Username / Email</label>
            <Input
              v-model="username"
              placeholder="admin"
              required
              class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-zinc-300">Password</label>
            <Input
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
              class="bg-zinc-950/60 border-zinc-800 focus:border-indigo-500 text-white"
            />
          </div>

          <Button
            type="submit"
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 h-auto transition-all shadow-lg shadow-indigo-600/20"
            :disabled="isLoading"
          >
            <Icon v-if="isLoading" name="lucide:loader-2" class="w-4 h-4 animate-spin mr-2" />
            <span>{{ isLoading ? 'Signing in...' : 'Sign In' }}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
