<script setup lang="ts">
import { ref, onMounted } from 'vue'

const {
  currentFontId,
  currentFontSizePx,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  setFont,
  setFontSizePx,
  initFont
} = useFont()

const isOpen = ref(false)

onMounted(() => {
  initFont()
})

const selectFont = (id: string) => {
  setFont(id)
}

const decreaseFontSize = () => {
  const newSize = Math.max(12, currentFontSizePx.value - 1)
  setFontSizePx(newSize)
}

const increaseFontSize = () => {
  const newSize = Math.min(22, currentFontSizePx.value + 1)
  setFontSizePx(newSize)
}
</script>

<template>
  <div class="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-sm shrink-0">
    <!-- Font Family Selector Icon Button -->
    <button
      @click="isOpen = true"
      type="button"
      class="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors flex items-center gap-1"
      title="UI Schriftart wählen"
    >
      <Icon name="lucide:type" class="w-3.5 h-3.5 text-indigo-400" />
    </button>

    <div class="w-[1px] h-3.5 bg-zinc-800"></div>

    <!-- Font Size Decrement (-) Button -->
    <button
      @click="decreaseFontSize"
      type="button"
      class="px-1.5 py-0.5 rounded text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
      title="Schriftgröße verkleinern"
    >
      A-
    </button>

    <!-- Font Size Indicator (px) -->
    <span class="text-[10px] font-mono text-indigo-300 font-semibold px-0.5 select-none">
      {{ currentFontSizePx }}px
    </span>

    <!-- Font Size Increment (+) Button -->
    <button
      @click="increaseFontSize"
      type="button"
      class="px-1.5 py-0.5 rounded text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
      title="Schriftgröße vergrößern"
    >
      A+
    </button>

    <!-- Teleported Modal Popover for Font & Size Configuration -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="isOpen"
          @click.self="isOpen = false"
          class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            @click.stop
            class="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 max-w-sm w-full shadow-2xl space-y-4 cursor-default"
          >
            <!-- Header -->
            <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div class="flex items-center gap-2">
                <Icon name="lucide:sliders" class="w-4 h-4 text-indigo-400" />
                <h3 class="font-bold text-sm text-white">UI Typografie & Größe</h3>
              </div>
              <button @click="isOpen = false" class="text-zinc-400 hover:text-white p-1 cursor-pointer">
                <Icon name="lucide:x" class="w-4 h-4" />
              </button>
            </div>

            <!-- Global Font Size Preset Selection -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Globale Schriftgröße (Offset)</label>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="opt in FONT_SIZE_OPTIONS"
                  :key="opt.id"
                  @click="setFontSizePx(opt.sizePx)"
                  :class="[
                    'py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer',
                    currentFontSizePx === opt.sizePx ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  ]"
                >
                  <div>{{ opt.name }}</div>
                  <div class="text-[9px] font-mono text-zinc-500">{{ opt.sizePx }}px</div>
                </button>
              </div>
            </div>

            <!-- Font Family Selection list -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Schriftart Familie</label>
              <div class="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
                <button
                  v-for="font in FONT_OPTIONS"
                  :key="font.id"
                  @click="selectFont(font.id)"
                  :class="[
                    'w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer text-left border',
                    currentFontId === font.id ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-md shadow-indigo-600/10' : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/80 hover:text-white hover:border-zinc-700'
                  ]"
                >
                  <div>
                    <div class="text-base font-semibold text-white leading-tight" :style="`font-family: ${font.family};`">
                      {{ font.name }}
                    </div>
                    <div class="text-[11px] text-zinc-400 font-sans mt-0.5">
                      {{ font.description }}
                    </div>
                  </div>

                  <div v-if="currentFontId === font.id" class="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                    <Icon name="lucide:check" class="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
