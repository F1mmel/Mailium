<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Card from '~/components/ui/card/Card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardContent from '~/components/ui/card/CardContent.vue'

const { isSupported, permission, subscribeToPush } = usePush()
const isIos = ref(false)
const isStandalone = ref(false)
const isDismissed = ref(false)
const isSubscribing = ref(false)
const isSuccess = ref(false)

onMounted(() => {
  if (process.client) {
    const userAgent = window.navigator.userAgent.toLowerCase()
    isIos.value = /iphone|ipad|ipod/.test(userAgent)
    isStandalone.value = ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches
  }
})

const handleEnableNotifications = async () => {
  isSubscribing.value = true
  const ok = await subscribeToPush()
  isSubscribing.value = false
  if (ok) {
    isSuccess.value = true
    setTimeout(() => {
      isDismissed.value = true
    }, 2500)
  }
}
</script>

<template>
  <div v-if="!isDismissed && (!isStandalone || permission === 'default')" class="fixed bottom-4 right-4 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5">
    <Card class="border-primary/20 bg-background/95 backdrop-blur-md shadow-2xl">
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <CardTitle class="text-base font-semibold flex items-center gap-2">
            <Icon name="lucide:smartphone" class="w-5 h-5 text-primary" />
            <span>Install App & Notifications</span>
          </CardTitle>
          <button @click="isDismissed = true" class="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1">
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>
        <CardDescription class="text-xs">
          Get instant mobile push notifications whenever a new email arrives.
        </CardDescription>
      </CardHeader>
      
      <CardContent class="space-y-3 pt-2 text-xs">
        <div v-if="isIos && !isStandalone" class="bg-muted/50 p-2.5 rounded-lg border border-border flex items-start gap-2">
          <Icon name="lucide:share" class="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>For iOS: Tap <strong>Share</strong> and select <strong>"Add to Home Screen"</strong>.</span>
        </div>

        <div v-if="permission === 'default'" class="flex items-center justify-between pt-1">
          <span class="text-muted-foreground">Enable Mobile Push Notifications</span>
          <Button size="sm" @click="handleEnableNotifications" :disabled="isSubscribing">
            <Icon v-if="isSubscribing" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin mr-1" />
            <span>{{ isSubscribing ? 'Enabling...' : 'Enable' }}</span>
          </Button>
        </div>

        <div v-if="isSuccess" class="text-emerald-500 font-medium flex items-center gap-1.5 pt-1">
          <Icon name="lucide:check-circle-2" class="w-4 h-4" />
          <span>Notifications enabled successfully!</span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
