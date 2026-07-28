<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
  x: number
  y: number
  account: any | null
}>()

const emits = defineEmits<{
  (e: 'close'): void
  (e: 'open-settings', accountId: string): void
  (e: 'hide-account', accountId: string): void
  (e: 'clear-password', accountId: string): void
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emits('close')
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (props.isOpen) {
    emits('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleClickOutside)
})

const onOpenSettings = () => {
  if (props.account) emits('open-settings', props.account.id)
  emits('close')
}

const onHideAccount = () => {
  if (props.account) emits('hide-account', props.account.id)
  emits('close')
}

const onClearPassword = () => {
  if (props.account) emits('clear-password', props.account.id)
  emits('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu-fade">
      <div
        v-if="isOpen && account"
        @click.stop
        @contextmenu.prevent
        class="fixed z-[99999] w-56 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl p-1.5 shadow-2xl space-y-0.5 text-xs text-zinc-300 font-sans select-none"
        :style="`top: ${y}px; left: ${x}px;`"
      >
        <!-- Header Info -->
        <div class="px-2.5 py-1.5 border-b border-zinc-800/80 mb-1">
          <div class="font-bold text-white truncate text-xs">{{ account.name }}</div>
          <div class="text-[10px] text-zinc-400 truncate font-mono">{{ account.email }}</div>
        </div>

        <!-- Open Settings -->
        <button
          @click="onOpenSettings"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer text-left"
        >
          <Icon name="lucide:settings" class="w-4 h-4 text-indigo-400" />
          <span>Open Account Settings</span>
        </button>

        <!-- Hide Account -->
        <button
          @click="onHideAccount"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer text-left"
        >
          <Icon name="lucide:eye-off" class="w-4 h-4 text-amber-400" />
          <span>Hide Account</span>
        </button>

        <div class="h-[1px] bg-zinc-800/80 my-1"></div>

        <!-- Clear Password / Revoke Access -->
        <button
          @click="onClearPassword"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-left"
        >
          <Icon name="lucide:key-round" class="w-4 h-4 text-rose-400" />
          <span>Clear Password (Revoke Access)</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
