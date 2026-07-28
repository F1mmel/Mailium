import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  devtools: { enabled: true },

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      host: true,
      watch: {
        ignored: ['**/data.json', '**/dataa.json', '**/storage/**', '**/.git/**']
      }
    }
  },

  nitro: {
    watchOptions: {
      ignore: ['**/data.json', '**/dataa.json', '**/storage/**', '**/.git/**']
    }
  },

  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxt/fonts'
  ],

  shadcn: {
    prefix: '',
    componentDir: './components/ui',
  },

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'dark'
  },

  fonts: {
    defaults: {
      weights: [300, 400, 500, 600, 700],
    },
  },

  compatibilityDate: '2024-12-14',

  app: {
    head: {
      title: 'Mailium - E-Mail Client',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'theme-color', content: '#09090b' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Mailium' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Geist:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lato:wght@300;400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;600;700&family=Sora:wght@300;400;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;600;700&family=Urbanist:wght@300;400;500;600;700&display=swap' }
      ]
    }
  }
})
