<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const { FONT_OPTIONS } = useFont()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedFont = computed(() => {
  return FONT_OPTIONS.find(f => f.id === props.modelValue) || FONT_OPTIONS[0]
})

const selectFont = (fontId: string) => {
  emits('update:modelValue', fontId)
  emits('change', fontId)
  isOpen.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="relative w-full">
    <!-- Trigger Button (h-9 to match right dropdown exactly) -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      class="w-full h-9 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 text-xs flex items-center justify-between transition-all cursor-pointer shadow-sm text-left group"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-semibold text-white text-xs truncate" :style="`font-family: ${selectedFont.family} !important;`">
          {{ selectedFont.name }}
        </span>
      </div>

      <Icon
        name="lucide:chevron-down"
        :class="['w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ml-1.5', isOpen ? 'rotate-180 text-indigo-400' : '']"
      />
    </button>

    <!-- Animated Custom Font Preview Options Menu -->
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-zinc-950 border border-zinc-800 rounded-xl p-1 shadow-2xl space-y-0.5 max-h-60 overflow-y-auto"
      >
        <button
          v-for="font in FONT_OPTIONS"
          :key="font.id"
          type="button"
          @click="selectFont(font.id)"
          :class="[
            'w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer border',
            props.modelValue === font.id
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-bold'
              : 'border-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white'
          ]"
        >
          <!-- Font Name rendered in its OWN unique typography -->
          <span
            class="text-xs font-semibold text-white truncate"
            :style="`font-family: ${font.family} !important;`"
          >
            {{ font.name }}
          </span>

          <!-- Selected Checkmark -->
          <Icon
            v-if="props.modelValue === font.id"
            name="lucide:check"
            class="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
