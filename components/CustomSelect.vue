<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface SelectOption {
  value: string | number
  label: string
}

const props = defineProps<{
  modelValue: string | number
  options: SelectOption[]
  placeholder?: string
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() => {
  return props.options.find(o => o.value === props.modelValue) || props.options[0]
})

const selectOption = (val: string | number) => {
  emits('update:modelValue', val)
  emits('change', val)
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
    <!-- Trigger Button (h-9 to match all dropdowns exactly) -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      class="w-full h-9 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg px-3 text-xs flex items-center justify-between transition-all cursor-pointer shadow-sm text-left group"
    >
      <span class="font-medium text-white text-xs truncate">
        {{ selectedOption?.label || placeholder || 'Select option' }}
      </span>

      <Icon
        name="lucide:chevron-down"
        :class="['w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ml-1.5', isOpen ? 'rotate-180 text-indigo-400' : '']"
      />
    </button>

    <!-- Animated Options Dropdown Menu -->
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-zinc-950 border border-zinc-800 rounded-xl p-1 shadow-2xl space-y-0.5 max-h-60 overflow-y-auto"
      >
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          @click="selectOption(opt.value)"
          :class="[
            'w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer border font-medium',
            props.modelValue === opt.value
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-bold'
              : 'border-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white'
          ]"
        >
          <span class="truncate">{{ opt.label }}</span>

          <!-- Selected Checkmark -->
          <Icon
            v-if="props.modelValue === opt.value"
            name="lucide:check"
            class="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1.5"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>
