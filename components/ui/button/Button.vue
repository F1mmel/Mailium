<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'

interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  class?: HTMLAttributes['class']
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  type: 'button',
  disabled: false
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'destructive': return 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm'
    case 'outline': return 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
    case 'secondary': return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    case 'ghost': return 'hover:bg-accent hover:text-accent-foreground'
    case 'link': return 'text-primary underline-offset-4 hover:underline'
    default: return 'bg-primary text-primary-foreground hover:bg-primary/90 shadow'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'h-8 rounded-md px-3 text-xs'
    case 'lg': return 'h-10 rounded-md px-8'
    case 'icon': return 'h-9 w-9 p-0'
    default: return 'h-9 px-4 py-2'
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
      variantClasses,
      sizeClasses,
      props.class
    )"
  >
    <slot />
  </button>
</template>
