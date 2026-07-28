<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { ref, watch, onBeforeUnmount } from 'vue'
import { compressImage, fileToBase64 } from '~/lib/image-utils'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Code,
  Upload,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
    }),
    Image.configure({
      allowBase64: true,
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Schreiben Sie Ihre E-Mail hier...',
    }),
  ],
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
  },
  editorProps: {
    attributes: {
      class: 'prose prose-invert focus:outline-none min-h-[220px] p-3 text-xs text-zinc-100 max-w-none font-sans leading-relaxed cursor-text',
    },
  },
})

watch(() => props.modelValue, (newValue) => {
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue, false)
  }
})

const fileInput = ref<HTMLInputElement | null>(null)
const isImageDialogOpen = ref(false)
const externalImageUrl = ref('')
const isUploading = ref(false)

const triggerImageUpload = () => {
  isImageDialogOpen.value = true
  externalImageUrl.value = ''
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  try {
    const file = target.files[0]
    isUploading.value = true
    
    const compressedFile = await compressImage(file)
    const base64 = await fileToBase64(compressedFile)
    
    if (editor.value) {
      editor.value.chain().focus().setImage({ src: base64 }).run()
    }
  } catch (error) {
    console.error('Failed to process editor image:', error)
  } finally {
    isUploading.value = false
    isImageDialogOpen.value = false
  }
}

const handleUrlUpload = async () => {
  if (!externalImageUrl.value) return
  if (editor.value) {
    editor.value.chain().focus().setImage({ src: externalImageUrl.value }).run()
  }
  isImageDialogOpen.value = false
}

const addLink = () => {
  const url = window.prompt('URL eingeben:')
  if (url && editor.value) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

const toggleBold = () => editor.value?.chain().focus().toggleBold().run()
const toggleItalic = () => editor.value?.chain().focus().toggleItalic().run()
const toggleUnderline = () => editor.value?.chain().focus().toggleUnderline().run()
const toggleH1 = () => editor.value?.chain().focus().toggleHeading({ level: 1 }).run()
const toggleH2 = () => editor.value?.chain().focus().toggleHeading({ level: 2 }).run()
const toggleBulletList = () => editor.value?.chain().focus().toggleBulletList().run()
const toggleOrderedList = () => editor.value?.chain().focus().toggleOrderedList().run()
const toggleBlockquote = () => editor.value?.chain().focus().toggleBlockquote().run()
const toggleCode = () => editor.value?.chain().focus().toggleCode().run()
const undo = () => editor.value?.chain().focus().undo().run()
const redo = () => editor.value?.chain().focus().redo().run()
const setTextAlign = (align: string) => editor.value?.chain().focus().setTextAlign(align).run()

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="border border-zinc-800 rounded-md shadow-sm bg-zinc-950 flex flex-col overflow-hidden cursor-text">
    <!-- RichText Toolbar -->
    <div v-if="editor" class="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-zinc-800 bg-zinc-900/90 sticky top-0 z-30 shrink-0 select-none cursor-default">
      <button type="button" @click="undo" :disabled="!editor.can().undo()" class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer" title="Undo">
        <Undo class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="redo" :disabled="!editor.can().redo()" class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer" title="Redo">
        <Redo class="h-3.5 w-3.5" />
      </button>
      
      <div class="w-[1px] h-4 bg-zinc-800 mx-1"></div>

      <button type="button" @click="toggleBold" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('bold') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Bold">
        <Bold class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="toggleItalic" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('italic') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Italic">
        <Italic class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="toggleUnderline" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('underline') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Underline">
        <UnderlineIcon class="h-3.5 w-3.5" />
      </button>

      <div class="w-[1px] h-4 bg-zinc-800 mx-1"></div>

      <button type="button" @click="setTextAlign('left')" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Align Left">
        <AlignLeft class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="setTextAlign('center')" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Align Center">
        <AlignCenter class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="setTextAlign('right')" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Align Right">
        <AlignRight class="h-3.5 w-3.5" />
      </button>

      <div class="w-[1px] h-4 bg-zinc-800 mx-1"></div>

      <button type="button" @click="toggleH1" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('heading', { level: 1 }) ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Heading 1">
        <Heading1 class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="toggleH2" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('heading', { level: 2 }) ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Heading 2">
        <Heading2 class="h-3.5 w-3.5" />
      </button>

      <div class="w-[1px] h-4 bg-zinc-800 mx-1"></div>

      <button type="button" @click="toggleBulletList" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('bulletList') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Bullet List">
        <List class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="toggleOrderedList" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('orderedList') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Ordered List">
        <ListOrdered class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="toggleBlockquote" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('blockquote') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Quote">
        <Quote class="h-3.5 w-3.5" />
      </button>
      <button type="button" @click="toggleCode" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('code') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Code">
        <Code class="h-3.5 w-3.5" />
      </button>

      <div class="w-[1px] h-4 bg-zinc-800 mx-1"></div>

      <button type="button" @click="addLink" :class="['p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer', editor.isActive('link') ? 'bg-indigo-600/30 text-indigo-300' : '']" title="Link">
        <LinkIcon class="h-3.5 w-3.5" />
      </button>
      
      <button type="button" @click="triggerImageUpload" class="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer" title="Add Image">
        <ImageIcon class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Image Dialog -->
    <Transition name="modal-fade">
      <div v-if="isImageDialogOpen" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-sm text-white">Bild hinzufügen</h4>
            <button @click="isImageDialogOpen = false" class="text-zinc-400 hover:text-white">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-3">
            <Button variant="outline" class="w-full gap-2 border-zinc-800 bg-zinc-900 text-white text-xs hover:bg-zinc-800" @click="fileInput?.click()">
              <Upload class="h-3.5 w-3.5" />
              Lokale Datei auswählen
            </Button>
            <input 
              ref="fileInput" 
              type="file" 
              accept="image/*" 
              class="hidden" 
              @change="handleFileChange" 
            />

            <div class="relative flex justify-center text-[10px] uppercase">
              <span class="bg-zinc-950 px-2 text-zinc-500 font-mono">ODER URL</span>
            </div>

            <div class="flex gap-2">
              <Input v-model="externalImageUrl" placeholder="https://..." class="bg-zinc-900 border-zinc-800 text-xs text-white" />
              <Button size="sm" :disabled="!externalImageUrl || isUploading" @click="handleUrlUpload" class="bg-indigo-600 text-white">
                <Globe class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <EditorContent :editor="editor" class="flex-1 cursor-text" />
  </div>
</template>

<style>
.tiptap {
  cursor: text;
}

.tiptap p.is-editor-empty:first-child::before {
  color: #71717a;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.tiptap h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  color: #ffffff;
}

.tiptap h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.5rem;
  margin-bottom: 0.35rem;
  color: #ffffff;
}

.tiptap a {
  color: #6366f1;
  text-decoration: underline;
  cursor: pointer;
}

.tiptap img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.75rem auto 0.75rem 0; /* Left aligned */
  border: 1px solid #27272a;
}

.tiptap blockquote {
  border-left: 3px solid #6366f1;
  padding-left: 0.75rem;
  font-style: italic;
  margin: 0.75rem 0;
  color: #a1a1aa;
}

.tiptap ul {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.tiptap ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.tiptap code {
  background-color: #27272a;
  color: #a5b4fc;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
}
</style>
