# Mailium ✉️

Mailium is a modern, high-performance web email client built with Nuxt 3, Vue 3, and TailwindCSS, featuring multi-account IMAP/SMTP support, real-time sync, and Mailcow integration.

## Features

- **Multi-Account IMAP/SMTP**: Seamlessly connect and manage multiple email accounts.
- **Rich Text Mail Composer**: Compose formatted emails with images and attachments using Tiptap.
- **Mailcow Auto-Sync**: Discover and synchronize accounts directly via Mailcow API.
- **Push Notifications & Web PWA**: Real-time alerts and native PWA support.
- **Standalone Binary**: Run as a self-contained executable binary (`./mailium` or `mailium.exe`) without needing Node.js or `node_modules` pre-installed!

---

## Standalone Binary Usage

Download the standalone binary for your platform from GitHub Releases / Workflow Artifacts:

### Linux
```bash
chmod +x mailium
./mailium
```

### Windows
```cmd
mailium.exe
```

The application will start the server listening on `http://localhost:3000`.

---

## Development Setup

### Prerequisites
- Node.js 20+

### Installation & Development
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Production build
npm run build

# Generate standalone executable binary
npm run build:binary
```
