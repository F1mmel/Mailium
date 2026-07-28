<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emits('update:modelValue', target.value)
}
</script>

<template>
  <input
    :type="type || 'text'"
    :value="modelValue ?? defaultValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    @input="handleInput"
    :class="cn(
      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
  />
</template>
