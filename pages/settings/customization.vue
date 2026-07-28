<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Input from '~/components/ui/input/Input.vue'
import Card from '~/components/ui/card/Card.vue'
import CardHeader from '~/components/ui/card/CardHeader.vue'
import CardTitle from '~/components/ui/card/CardTitle.vue'
import CardDescription from '~/components/ui/card/CardDescription.vue'
import CardContent from '~/components/ui/card/CardContent.vue'
import CustomFontDropdown from '~/components/CustomFontDropdown.vue'
import CustomSelect from '~/components/CustomSelect.vue'

const { customization, fetchCustomization, saveCustomization } = useCustomization()
const { currentFontId, currentFontSizePx, FONT_OPTIONS, FONT_SIZE_OPTIONS, setFont, setFontSizePx, initFont } = useFont()
const toast = useToast()

const appNameInput = ref('')
const selectedAccentColor = ref('#6366f1')
const selectedDensity = ref<'comfortable' | 'compact'>('comfortable')
const selectedDateFormat = ref<'relative' | 'absolute'>('relative')

const selectedFontId = ref('inter')
const selectedFontSizePx = ref<number>(15)

const isSaving = ref(false)

const accentPresets = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Ocean Blue', color: '#3b82f6' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Crimson', color: '#ef4444' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Cyan', color: '#06b6d4' }
]

const fontSizeOptions = computed(() => {
  return FONT_SIZE_OPTIONS.map(s => ({
    value: s.sizePx,
    label: `${s.name} (${s.description})`
  }))
})

const densityOptions = [
  { value: 'comfortable', label: 'Comfortable (Standard Padding)' },
  { value: 'compact', label: 'Compact (Tighter Rows)' }
]

const dateFormatOptions = [
  { value: 'relative', label: 'Relative Time (e.g. 5m ago, Yesterday)' },
  { value: 'absolute', label: 'Absolute Date (e.g. Jul 28, 2026 00:30)' }
]

// Mock sample emails for instant live preview
const sampleEmails = [
  {
    id: '1',
    sender: 'GitHub Team',
    subject: '[Security Alert] New login detected on Windows',
    snippet: 'Your account was accessed from a new IP address in Frankfurt.',
    relativeDate: '5m ago',
    absoluteDate: 'Jul 28, 2026 00:41',
    isUnread: true
  },
  {
    id: '2',
    sender: 'Sarah Jenkins',
    subject: 'Project Mailium Design Feedback & Updates',
    snippet: 'Hi Finn, I reviewed the latest customization tabs and accent colors. Looks amazing!',
    relativeDate: '2h ago',
    absoluteDate: 'Jul 27, 2026 22:45',
    isUnread: false
  },
  {
    id: '3',
    sender: 'Stripe Payments',
    subject: 'Receipt for your monthly subscription #2049',
    snippet: 'Your payment of €29.00 was successfully processed for Mailium Pro.',
    relativeDate: 'Yesterday',
    absoluteDate: 'Jul 26, 2026 14:15',
    isUnread: false
  }
]

onMounted(async () => {
  initFont()
  await fetchCustomization()
  appNameInput.value = customization.value.appName
  selectedAccentColor.value = customization.value.accentColor
  selectedDensity.value = customization.value.density
  selectedDateFormat.value = customization.value.dateFormat

  selectedFontId.value = currentFontId.value
  selectedFontSizePx.value = currentFontSizePx.value
})

const selectPresetColor = (color: string) => {
  selectedAccentColor.value = color
}

const handleFontChange = (fontId: string) => {
  selectedFontId.value = fontId
  setFont(fontId)
}

const handleFontSizeChange = (px: string | number) => {
  const val = typeof px === 'string' ? parseFloat(px) : px
  selectedFontSizePx.value = val
  setFontSizePx(val)
}

const handleSaveCustomization = async () => {
  isSaving.value = true
  try {
    setFont(selectedFontId.value)
    setFontSizePx(selectedFontSizePx.value)
    await saveCustomization({
      appName: appNameInput.value.trim() || 'Mailium',
      accentColor: selectedAccentColor.value,
      density: selectedDensity.value,
      dateFormat: selectedDateFormat.value
    })
    toast.success('Customization Saved', 'App typography, branding, and appearance settings updated.')
  } catch (e: any) {
    toast.error('Save Failed', e?.message || 'Could not save customization settings.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <NuxtLink to="/" class="text-xs text-indigo-400 hover:underline flex items-center gap-1 mb-1">
            <Icon name="lucide:arrow-left" class="w-3.5 h-3.5" />
            <span>Back to Inbox</span>
          </NuxtLink>
          <h1 class="text-2xl font-bold text-white tracking-tight">Appearance & Customization</h1>
        </div>
      </div>

      <!-- Settings Navigation Tabs Header -->
      <div class="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <NuxtLink
          to="/settings/accounts"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
        >
          <Icon name="lucide:server" class="w-4 h-4" />
          <span>Accounts & Storage</span>
        </NuxtLink>

        <NuxtLink
          to="/settings/customization"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
        >
          <Icon name="lucide:palette" class="w-4 h-4" />
          <span>Customization</span>
        </NuxtLink>
      </div>

      <!-- Customization Form Card -->
      <form @submit.prevent="handleSaveCustomization" class="space-y-6">
        <!-- 1. App Name & Branding Card -->
        <Card class="border-zinc-800 bg-zinc-900 shadow-xl">
          <CardHeader class="pb-3 border-b border-zinc-800/80">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Icon name="lucide:type" class="w-4 h-4" />
              </div>
              <div>
                <CardTitle class="text-base font-bold text-white">App Branding Name</CardTitle>
                <CardDescription class="text-xs text-zinc-400">Customize the application name displayed in the sidebar, header, and page title.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-4 space-y-3">
            <div class="space-y-1.5 max-w-md">
              <label class="text-xs font-semibold text-zinc-300">Custom Application Title</label>
              <Input
                v-model="appNameInput"
                placeholder="e.g. Mailium, DevMail, Work Inbox"
                required
                class="bg-zinc-950 border-zinc-800 text-white text-xs h-9"
              />
            </div>
          </CardContent>
        </Card>

        <!-- 2. Primary Accent Color Card -->
        <Card class="border-zinc-800 bg-zinc-900 shadow-xl">
          <CardHeader class="pb-3 border-b border-zinc-800/80">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Icon name="lucide:palette" class="w-4 h-4" />
              </div>
              <div>
                <CardTitle class="text-base font-bold text-white">Accent Color Theme</CardTitle>
                <CardDescription class="text-xs text-zinc-400">Select a primary accent color for active items, borders, toggles, and highlights.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-4 space-y-4">
            <!-- Preset Color Swatches -->
            <div class="space-y-2">
              <label class="text-xs font-semibold text-zinc-300">Color Presets</label>
              <div class="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                <button
                  v-for="preset in accentPresets"
                  :key="preset.color"
                  type="button"
                  @click="selectPresetColor(preset.color)"
                  :class="[
                    'p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer group',
                    selectedAccentColor.toLowerCase() === preset.color.toLowerCase() ? 'border-white bg-zinc-950 ring-2 ring-indigo-500' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                  ]"
                >
                  <div
                    class="w-6 h-6 rounded-full shadow-md transition-transform group-hover:scale-110"
                    :style="`background-color: ${preset.color};`"
                  ></div>
                  <span class="text-[10px] font-medium text-zinc-400 group-hover:text-white truncate max-w-full">{{ preset.name }}</span>
                </button>
              </div>
            </div>

            <!-- Custom Hex Color Picker -->
            <div class="pt-2 border-t border-zinc-800/60 flex items-center gap-4">
              <div class="space-y-1">
                <label class="text-xs font-semibold text-zinc-300">Custom Color Picker</label>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    v-model="selectedAccentColor"
                    class="w-8 h-8 rounded-lg border border-zinc-700 bg-zinc-950 cursor-pointer"
                  />
                  <Input
                    v-model="selectedAccentColor"
                    placeholder="#6366f1"
                    class="w-32 bg-zinc-950 border-zinc-800 text-white text-xs h-8 font-mono"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 3. Typography & Font Settings Card with Visual Preview Dropdown -->
        <Card class="border-zinc-800 bg-zinc-900 shadow-xl overflow-visible">
          <CardHeader class="pb-3 border-b border-zinc-800/80">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Icon name="lucide:baseline" class="w-4 h-4" />
              </div>
              <div>
                <CardTitle class="text-base font-bold text-white">Typography & Font Size</CardTitle>
                <CardDescription class="text-xs text-zinc-400">Select UI font family and text scaling for the entire application.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-4 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <!-- Visual Custom Font Dropdown -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">UI Font Family</label>
                <CustomFontDropdown v-model="selectedFontId" @change="handleFontChange" />
              </div>

              <!-- Sleek CustomSelect for Font Size -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">UI Font Size</label>
                <CustomSelect
                  v-model="selectedFontSizePx"
                  :options="fontSizeOptions"
                  @change="handleFontSizeChange"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 4. Layout Density & Display Preferences Card with Live Sample Inbox Preview -->
        <Card class="border-zinc-800 bg-zinc-900 shadow-xl overflow-visible">
          <CardHeader class="pb-3 border-b border-zinc-800/80">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Icon name="lucide:sliders" class="w-4 h-4" />
              </div>
              <div>
                <CardTitle class="text-base font-bold text-white">Inbox Display & Density</CardTitle>
                <CardDescription class="text-xs text-zinc-400">Configure mail list layout padding and date formatting with instant live preview.</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-4 space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Sleek CustomSelect for Layout Density -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">Email List Density</label>
                <CustomSelect
                  v-model="selectedDensity"
                  :options="densityOptions"
                />
              </div>

              <!-- Sleek CustomSelect for Date Format -->
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">Date Display Format</label>
                <CustomSelect
                  v-model="selectedDateFormat"
                  :options="dateFormatOptions"
                />
              </div>
            </div>

            <!-- INSTANT LIVE SAMPLE INBOX PREVIEW BOX -->
            <div class="pt-3 border-t border-zinc-800/60 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Icon name="lucide:eye" class="w-4 h-4 text-indigo-400" />
                  Live Sample Inbox Preview
                </span>
                <span class="text-[10px] text-zinc-500 font-mono">
                  Density: <strong class="text-indigo-300 uppercase">{{ selectedDensity }}</strong> | Format: <strong class="text-indigo-300 uppercase">{{ selectedDateFormat }}</strong>
                </span>
              </div>

              <!-- Mock Email List Box -->
              <div class="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-inner divide-y divide-zinc-900">
                <div
                  v-for="(email, idx) in sampleEmails"
                  :key="email.id"
                  :class="[
                    'flex items-start transition-all cursor-default border-l-4',
                    idx === 0 ? 'bg-indigo-600/15 border-l-indigo-500' : 'border-l-transparent hover:bg-zinc-900/60',
                    selectedDensity === 'compact' ? 'px-3 py-1.5 gap-2' : 'px-3.5 py-3 gap-3'
                  ]"
                >
                  <!-- Avatar circle -->
                  <div class="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5">
                    {{ email.sender.charAt(0) }}
                  </div>

                  <!-- Email content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between text-zinc-300 leading-tight">
                      <span :class="['truncate text-xs', email.isUnread ? 'font-bold text-white' : 'font-semibold text-zinc-300']">
                        {{ email.sender }}
                      </span>
                      <span :class="['text-[11px] shrink-0 font-mono ml-2', email.isUnread ? 'text-indigo-300 font-semibold' : 'text-zinc-500']">
                        {{ selectedDateFormat === 'relative' ? email.relativeDate : email.absoluteDate }}
                      </span>
                    </div>

                    <div class="truncate text-xs leading-tight mt-0.5">
                      <span :class="[email.isUnread ? 'font-bold text-white' : 'font-medium text-zinc-300']">{{ email.subject }}</span>
                    </div>

                    <p v-if="selectedDensity === 'comfortable'" class="text-[11px] text-zinc-400 truncate mt-0.5">
                      {{ email.snippet }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Save Button -->
        <div class="flex justify-end pt-2">
          <Button type="submit" size="sm" :disabled="isSaving" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-6 py-2 h-9 font-semibold shadow-lg shadow-indigo-600/20">
            <Icon v-if="isSaving" name="lucide:loader-2" class="w-4 h-4 mr-1.5 animate-spin" />
            <Icon v-else name="lucide:save" class="w-4 h-4 mr-1.5" />
            <span>Save Customization Settings</span>
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
