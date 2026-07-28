<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()

const getIcon = (type?: string) => {
  if (type === 'error') return 'lucide:alert-circle'
  if (type === 'warning') return 'lucide:alert-triangle'
  if (type === 'info') return 'lucide:info'
  return 'lucide:check-circle-2'
}

const getIconColor = (type?: string) => {
  if (type === 'error') return 'text-rose-400'
  if (type === 'warning') return 'text-amber-400'
  if (type === 'info') return 'text-indigo-400'
  return 'text-emerald-400'
}

const getBorderColor = (type?: string) => {
  if (type === 'error') return 'border-rose-500/30'
  if (type === 'warning') return 'border-amber-500/30'
  if (type === 'info') return 'border-indigo-500/30'
  return 'border-emerald-500/30'
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none select-none max-w-sm w-full">
      <TransitionGroup name="toast-list">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="[
            'pointer-events-auto p-3.5 px-4 rounded-xl border bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex items-start justify-between gap-3 text-xs text-white transition-all',
            getBorderColor(t.type)
          ]"
        >
          <div class="flex items-start gap-3 min-w-0">
            <div class="shrink-0 mt-0.5">
              <Icon :name="getIcon(t.type)" :class="['w-4 h-4', getIconColor(t.type)]" />
            </div>

            <div class="space-y-0.5 min-w-0">
              <h4 class="font-bold text-xs text-white leading-tight truncate">{{ t.title }}</h4>
              <p v-if="t.message" class="text-[11px] text-zinc-400 leading-snug line-clamp-2">{{ t.message }}</p>
            </div>
          </div>

          <button
            @click="removeToast(t.id)"
            class="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors shrink-0 cursor-pointer"
          >
            <Icon name="lucide:x" class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
</style>
