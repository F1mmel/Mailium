<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import ToastContainer from '~/components/ToastContainer.vue'

const { user } = useAuth()
const { initGlobalPush } = useEmail()
const { initFont } = useFont()
const { fetchCustomization } = useCustomization()

const isReady = ref(false)

onMounted(async () => {
  if (process.client) {
    try {
      initFont()
      await fetchCustomization()
    } catch (e) {
      console.error('Initialization error:', e)
    } finally {
      isReady.value = true
    }
  } else {
    isReady.value = true
  }
})

watch(user, (u) => {
  if (u && process.client) {
    initGlobalPush()
  }
}, { immediate: true })
</script>

<template>
  <div class="bg-zinc-950 min-h-screen text-zinc-100 antialiased font-sans">
    <!-- Sleek Dark Loader until Custom Settings & Fonts are 100% Fetched -->
    <div v-if="!isReady" class="h-screen w-screen bg-zinc-950 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      </div>
    </div>

    <!-- Render Full Application only when settings are 100% ready -->
    <NuxtLayout v-else>
      <NuxtPage />
      <ToastContainer />
    </NuxtLayout>
  </div>
</template>
