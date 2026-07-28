<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  isOpen: boolean
  x: number
  y: number
  message?: any
}>()

const emits = defineEmits<{
  (e: 'close'): void
  (e: 'mark-read', msg: any): void
  (e: 'mark-unread', msg: any): void
  (e: 'reply', msg: any): void
  (e: 'forward', msg: any): void
  (e: 'set-tag', payload: { msg: any; tag: string; add: boolean }): void
  (e: 'move-trash', msg: any): void
}>()

const menuRef = ref<HTMLElement | null>(null)
const showTagSubmenu = ref(false)

const availableTags = [
  { id: '\\Flagged', label: 'Starred / Flagged', color: 'bg-amber-500', text: 'text-amber-400', icon: 'lucide:star' },
  { id: '$Important', label: 'High Priority', color: 'bg-red-500', text: 'text-red-400', icon: 'lucide:flag' },
  { id: '$Work', label: 'Work', color: 'bg-indigo-500', text: 'text-indigo-400', icon: 'lucide:briefcase' },
  { id: '$Personal', label: 'Personal', color: 'bg-emerald-500', text: 'text-emerald-400', icon: 'lucide:user' },
]

const handleOutsideClick = (e: MouseEvent) => {
  if (!props.isOpen) return
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emits('close')
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emits('close')
  }
}

watch(() => props.isOpen, (newVal) => {
  showTagSubmenu.value = false
  if (newVal && process.client) {
    nextTick(() => {
      window.addEventListener('pointerdown', handleOutsideClick)
      window.addEventListener('keydown', handleKeyDown)
    })
  } else if (process.client) {
    window.removeEventListener('pointerdown', handleOutsideClick)
    window.removeEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('pointerdown', handleOutsideClick)
    window.removeEventListener('keydown', handleKeyDown)
  }
})

const hasTag = (tagId: string) => {
  if (!props.message || !props.message.flags) return false
  return props.message.flags.includes(tagId)
}

const toggleTag = (tagId: string) => {
  const isPresent = hasTag(tagId)
  emits('set-tag', { msg: props.message, tag: tagId, add: !isPresent })
  emits('close')
}

const getAdjustedPosition = () => {
  if (import.meta.server) return { left: '0px', top: '0px' }
  const menuWidth = 230
  const menuHeight = 240
  let posX = props.x
  let posY = props.y

  if (posX + menuWidth > window.innerWidth) {
    posX = window.innerWidth - menuWidth - 10
  }
  if (posY + menuHeight > window.innerHeight) {
    posY = window.innerHeight - menuHeight - 10
  }

  return {
    left: `${posX}px`,
    top: `${posY}px`
  }
}
</script>

<template>
  <Transition name="context-menu-fade">
    <div
      v-if="isOpen && message"
      ref="menuRef"
      @click.stop
      @contextmenu.prevent.stop
      :style="getAdjustedPosition()"
      class="fixed z-50 w-56 rounded-2xl border border-white/10 bg-zinc-950/85 backdrop-blur-2xl p-1.5 text-zinc-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-white/10 select-none"
    >
      <div class="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-white/10 mb-1 truncate">
        {{ message.subject }}
      </div>

      <div class="space-y-0.5 text-xs">
        <button
          v-if="!message.isRead"
          @click.stop="emits('mark-read', message); emits('close')"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-zinc-200 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all cursor-pointer"
        >
          <Icon name="lucide:check-circle" class="w-4 h-4 text-indigo-400" />
          <span>Mark as Read</span>
        </button>

        <button
          v-else
          @click.stop="emits('mark-unread', message); emits('close')"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-zinc-200 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all cursor-pointer"
        >
          <Icon name="lucide:circle" class="w-4 h-4 text-indigo-400" />
          <span>Mark as Unread</span>
        </button>

        <button
          @click.stop="emits('reply', message); emits('close')"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          <Icon name="lucide:reply" class="w-4 h-4 text-zinc-400" />
          <span>Reply</span>
        </button>

        <button
          @click.stop="emits('forward', message); emits('close')"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
          <Icon name="lucide:forward" class="w-4 h-4 text-zinc-400" />
          <span>Forward</span>
        </button>

        <!-- Hover Submenu Container with Seamless Hover Bridge -->
        <div
          @mouseenter="showTagSubmenu = true"
          @mouseleave="showTagSubmenu = false"
          class="relative group"
        >
          <button
            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-zinc-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <div class="flex items-center gap-2.5">
              <Icon name="lucide:tag" class="w-4 h-4 text-indigo-400" />
              <span>Set Tag / Priority</span>
            </div>
            <Icon name="lucide:chevron-right" class="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <!-- Smooth Left-to-Right Animated Hover Side Flyout Submenu -->
          <Transition name="submenu-slide">
            <div
              v-if="showTagSubmenu"
              class="absolute left-full top-0 -ml-1 pl-2.5 w-48 z-50 origin-left"
            >
              <div class="rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-1.5 shadow-2xl space-y-0.5">
                <button
                  v-for="t in availableTags"
                  :key="t.id"
                  @click.stop="toggleTag(t.id)"
                  class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-indigo-600/30 hover:text-white transition-colors cursor-pointer"
                >
                  <div class="flex items-center gap-2">
                    <span :class="['w-2 h-2 rounded-full', t.color]"></span>
                    <Icon :name="t.icon" :class="['w-3.5 h-3.5', t.text]" />
                    <span>{{ t.label }}</span>
                  </div>
                  <Icon v-if="hasTag(t.id)" name="lucide:check" class="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <hr class="border-white/10 my-1" />

        <button
          @click.stop="emits('move-trash', message); emits('close')"
          class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer"
        >
          <Icon name="lucide:trash-2" class="w-4 h-4 text-red-400" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.submenu-slide-enter-active,
.submenu-slide-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.submenu-slide-enter-from,
.submenu-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px) scale(0.95);
}

.submenu-slide-enter-to,
.submenu-slide-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}
</style>
