<script setup lang="ts">
import { ref, computed } from 'vue'

const colorMode = useColorMode()
const isOpen = ref(false)

const themes = [
  { id: 'system', name: 'System', icon: 'lucide:laptop' },
  { id: 'light', name: 'Light', icon: 'lucide:sun' },
  { id: 'dark', name: 'Dark', icon: 'lucide:moon' },
]

const selectTheme = (id: string) => {
  colorMode.preference = id
  isOpen.value = false
}

const activeIcon = computed(() => {
  if (colorMode.preference === 'light') return 'lucide:sun'
  if (colorMode.preference === 'dark') return 'lucide:moon'
  return 'lucide:laptop'
})
</script>

<template>
  <div class="relative inline-block text-left select-none">
    <!-- Trigger Button -->
    <button
      @click="isOpen = !isOpen"
      type="button"
      class="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
      title="Design-Modus wählen (Light / Dark / System)"
    >
      <Icon :name="activeIcon" class="w-4 h-4 text-indigo-400" />
      <span class="text-xs font-medium capitalize hidden sm:inline">{{ colorMode.preference || 'system' }}</span>
      <Icon name="lucide:chevron-down" :class="['w-3 h-3 text-zinc-500 transition-transform', isOpen ? 'rotate-180' : '']" />
    </button>

    <!-- Dropdown Menu -->
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        @click.stop
        class="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl p-1.5 shadow-2xl z-50 space-y-0.5"
      >
        <button
          v-for="t in themes"
          :key="t.id"
          @click="selectTheme(t.id)"
          :class="[
            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
            colorMode.preference === t.id ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30' : 'hover:bg-zinc-900 text-zinc-300 hover:text-white border border-transparent'
          ]"
        >
          <div class="flex items-center gap-2">
            <Icon :name="t.icon" class="w-3.5 h-3.5 text-indigo-400" />
            <span>{{ t.name }}</span>
          </div>
          <Icon v-if="colorMode.preference === t.id" name="lucide:check" class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        </button>
      </div>
    </Transition>
  </div>
</template>
