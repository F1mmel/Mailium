<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
  x: number
  y: number
  accountId: string | null
  folder: any | null
}>()

const emits = defineEmits<{
  (e: 'close'): void
  (e: 'rename-folder', payload: { accountId: string; folder: any }): void
  (e: 'delete-folder', payload: { accountId: string; folder: any }): void
}>()

const isInbox = computed(() => {
  if (!props.folder) return false
  const p = (props.folder.path || props.folder.name || '').toUpperCase()
  return p === 'INBOX' || p.endsWith('/INBOX')
})

const handleClickOutside = (e: MouseEvent) => {
  if (props.isOpen) {
    emits('close')
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

const handleRename = () => {
  if (isInbox.value || !props.accountId || !props.folder) return
  emits('rename-folder', { accountId: props.accountId, folder: props.folder })
  emits('close')
}

const handleDelete = () => {
  if (isInbox.value || !props.accountId || !props.folder) return
  emits('delete-folder', { accountId: props.accountId, folder: props.folder })
  emits('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="isOpen && folder"
        :style="{ top: `${y}px`, left: `${x}px` }"
        @click.stop
        class="fixed z-[99999] w-52 bg-zinc-950/95 border border-zinc-800/90 backdrop-blur-xl rounded-xl shadow-2xl p-1 text-xs text-zinc-200 select-none cursor-default space-y-0.5"
      >
        <!-- Folder Title Header -->
        <div class="px-2.5 py-1.5 border-b border-zinc-800/80 mb-1 flex items-center justify-between">
          <div class="truncate font-bold text-white flex items-center gap-1.5">
            <Icon name="lucide:folder" class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span class="truncate">{{ folder.name }}</span>
          </div>
          <span v-if="isInbox" class="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">Protected</span>
        </div>

        <!-- Disabled System Warning for INBOX -->
        <div v-if="isInbox" class="px-2.5 py-2 text-[11px] text-zinc-400 italic bg-zinc-900/60 rounded-lg flex items-center gap-1.5">
          <Icon name="lucide:lock" class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>INBOX system folder cannot be modified or deleted.</span>
        </div>

        <!-- Action Items (Active for Non-INBOX folders) -->
        <template v-else>
          <button
            @click="handleRename"
            class="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 hover:bg-indigo-600/20 hover:text-white transition-colors cursor-pointer"
          >
            <Icon name="lucide:edit-3" class="w-3.5 h-3.5 text-indigo-400" />
            <span>Rename Folder</span>
          </button>

          <button
            @click="handleDelete"
            class="w-full px-2.5 py-1.5 rounded-lg text-left flex items-center gap-2 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <Icon name="lucide:trash-2" class="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Folder</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
