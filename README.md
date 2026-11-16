# QUANTUM-SAFE
### Secure Communication System
*Post-Quantum Cryptography (ML-KEM-768) & AES-256-GCM Secure Messaging Platform*

---

## 🛡️ Project Overview

**QUANTUM-SAFE** is a cybersecurity and digital identity web application designed to protect real-time enterprise communication and sensitive transit data against future quantum-computing threats.

While classical public-key cryptography (RSA and Elliptic Curve Cryptography / ECC) will be broken in polynomial time by Shor's algorithm once large-scale quantum computers operate, **QUANTUM-SAFE** employs lattice-based post-quantum key encapsulation (**ML-KEM-768 / NIST FIPS 203**) combined with authenticated symmetric encryption (**AES-256-GCM**) to defend against current **"Store Now, Decrypt Later" (SNDL)** harvesting campaigns.

> **Enterprise Frontend Architecture:**
> Features zero external server dependencies while providing fully functioning client-side Web Crypto API operations: real SHA-256 integrity calculation, authentic file uploads with instant binary downloads, Web Crypto keypair generation, local persistence, and live security audit trails.

---

## ✨ Design Direction & Aesthetic

Inspired by modern enterprise cybersecurity SaaS applications (Cloudflare, CrowdStrike, SentinelOne):

* **Color Palette:**
  * Deep Navy Background: `#07111F`
  * Secondary Surface Background: `#0D1B2A`
  * Elevated Cards: `#112438`
  * Primary Accent: Electric Cyan (`#00D9FF`)
  * Secondary Accent: Teal (`#00E5B0`)
  * Text: High-contrast white (`#FFFFFF`) and slate gray (`#94A3B8`)
* **Visual Atmosphere:**
  * Clean, dark theme with subtle glowing borders (`rgba(0, 217, 255, 0.2)`).
  * Glassmorphism (`backdrop-filter: blur(14px)`).
  * Smooth CSS transitions and micro-interactions.
  * Modern typography with monospace accents for cryptographic keys, hashes, and ciphertexts.
  * Zero-dependency embedded Lucide icons (scalable, crisp SVGs).
  * Fully responsive across mobile, tablet, and ultra-wide displays.

---

## 🖥️ Pages & Features Implemented

The application is structured as a client-side Single Page Application (SPA) with hash routing (`#/landing`, `#/login`, `#/register`, `#/dashboard`, `#/chat`, `#/security`, `#/files`, `#/logs`, `#/settings`):

### 1. Landing Page (`#/landing`)
* **Navigation Bar:** Logo, brand title, anchor links, and quick-auth actions.
* **Hero Section:**
  * Heading: *"Your Communication. Protected Beyond Tomorrow."*
  * Post-Quantum ML-KEM subtitle.
  * Primary CTAs: *Get Started*, *Explore Security*, and *Launch Live Demo*.
  * Cyber Visual: Interactive HTML5 Canvas rendering a dynamic quantum lattice network, rotating dashed rings, and floating status cards.
* **Features Grid:** ML-KEM encapsulation, AES-256-GCM payload shield, ephemeral forward secrecy, and tamper-evident audit logs.
* **How It Works:** 3-step breakdown of lattice key generation, zero-knowledge encapsulation, and authenticated delivery.
* **Cryptographic Standards:** Detailed technical specifications for **NIST FIPS 203 (ML-KEM)** and **AES-256-GCM**.
* **Why Quantum-Safe Security Matters:** Explaining "Store Now, Decrypt Later" (SNDL) attacks and classical vs. quantum comparison.
* **Footer:** Comprehensive sitemap, platform links, and project copyright.

### 2. Login Page (`#/login`)
* Centered glassmorphic card with glowing borders.
* Email and password inputs with field validation.
* Interactive password visibility toggle (`eye` / `eye-off`).
* Remember me checkbox and forgot password prompt.
* Simulated authentication button triggering an ML-KEM session handshake and redirection to dashboard.

### 3. Register Page (`#/register`)
* Full name, work email, master password, and password confirmation fields.
* **Password Strength Meter:** Real-time entropy evaluator with 4 segmented colored bars and requirement criteria checkmarks (8+ characters, mixed case, numbers, special characters).
* Creates user identity and navigates directly to the main application.

### 4. Main Dashboard (`#/dashboard`)
* Welcome banner with active identity posture (*"Optimal / Quantum Resilient"*).
* **Security Overview Metric Cards:**
  * Total Messages Protected (`18,492`)
  * Active Secure Sessions (`12 channels`)
  * ML-KEM Handshake Speed (`0.84 ms`)
  * Quantum Resistance Score (`99.8%`)
* **Interactive Data Visualizations:**
  * 24-hour transit traffic & handshake volume line chart rendered on HTML5 Canvas with glowing gradients.
  * Cipher suite distribution progress meters (ML-KEM-768, ML-KEM-1024, Hybrid).
* **Quick Action Buttons:** Quick shortcuts to start a chat, upload a file, sample a lattice keypair, or inspect audit logs.
* **Recent Activity Feed:** Real-time stream of cryptographic events with timestamp and status badges.

### 5. Secure Chat Page (`#/chat`)
* **Left Contacts Pane:** Search contacts input, live presence indicators (online/away/offline), verified PQC badges, and preview snippets.
* **Central Conversation Window:**
  * Header with active contact status and *"End-to-End Encrypted (Demo UI)"* badge.
  * Speech bubbles styled for incoming and outgoing messages with verified timestamps.
  * Real-time message sending with local frontend state updates.
  * **Simulated Automated Responses:** After sending a message, the recipient displays an animated decapsulation typing indicator and automatically replies with context-appropriate quantum telemetry!

### 6. Security Dashboard (`#/security`)
* **Cryptographic Specification Cards:** Deep-dive parameters for ML-KEM-768 (dimension $k=3$, modulus $q=3329$, public key $1,184$ B) and AES-256-GCM (256-bit key, 96-bit IV, 128-bit GHASH tag).
* **Interactive 6-Stage Visual Workflow Pipeline:**
  $$\text{Sender (Key Gen)} \longrightarrow \text{Public Key Transmit} \longrightarrow \text{ML-KEM Encapsulation} \longrightarrow \text{Shared Secret KDF} \longrightarrow \text{AES-256-GCM AEAD} \longrightarrow \text{Receiver Verification}$$
  * Interactive step-by-step navigation with mathematical formulas and parameter inspection.
  * *"Simulate Handshake"* automated playback with animated signals and notifications.
* **Ephemeral Keypair Generator Widget:** Interactive tool to sample fresh lattice vectors and generate new public key fingerprints.
* **Integrity & Downgrade Prevention Card:** Enforcing zero classical fallbacks.

### 7. File Sharing Vault (`#/files`)
* **Drag-and-Drop Dropzone:** Animated upload zone with dashed border and hover glow.
* **Browse Files Button:** Integrates with local file picker.
* **Simulated Encryption Progress Bar:** Animates progress through ML-KEM session key wrapping and AES-256-GCM encryption before dynamically prepending the file to the vault list.
* **Recent Shared Files Table:** File type icons, file size, date, encryption status, and simulated download interaction.

### 8. Security Audit Logs (`#/logs`)
* Comprehensive audit history table with Event ID, Timestamp, Details, Status, and Actor.
* **Category Filters:** Quick filter buttons for *All*, *Cryptography*, *Messages*, *Authentication*, *File Vault*, and *Threat Intercepts*.
* **Live Search:** Instant filter by keyword, IP address, actor, or event code.
* **Inspect Modal:** Click any log to inspect its cryptographic metadata, hash chain, and verification details.

### 9. Settings & Identity (`#/settings`)
* Sidebar navigation between *Cryptographic Profile*, *PQC Security Policy*, *Account & Devices*, and *UI Preferences*.
* Public key fingerprint display with one-click copy to clipboard.
* Toggle switches for *Strict Ephemeral Rekeying (15m)*, *Zero-Trace Memory Scrubbing*, and *Reject Legacy Classical Downgrade*.
* Theme selection cards (Deep Navy, Cyber Teal, High Contrast).
* *"Save Preferences"* button with toast notification feedback.

---

## 📁 Project File Structure

```
QuantumSafeSystem/
├── index.html            # Main semantic HTML5 markup containing all views and shells
├── package.json          # Node.js project manifest & startup scripts
├── README.md             # Project documentation and architectural roadmap
├── assets/
│   └── logo.svg          # Quantum-Safe vector shield & lattice brand logo
├── css/
│   ├── variables.css     # Design tokens, color palette, gradients, typography
│   ├── base.css          # Resets, animations, custom scrollbars, utility classes
│   ├── layout.css        # App shell, sidebar, sticky header, mobile drawer
│   ├── components.css    # Buttons, inputs, cards, badges, modal, toast system
│   ├── landing.css       # Landing page styling, hero, features, comparison cards
│   ├── auth.css          # Login & Register views, password strength meter
│   ├── dashboard.css     # Metric cards, grid layout, chart container, feeds
│   ├── chat.css          # Contacts pane, conversation bubbles, input bar
│   ├── security.css      # PQC cards, interactive 6-stage pipeline visualizer
│   ├── files.css         # Drag-and-drop dropzone, progress bar, files table
│   ├── logs.css          # Audit trail table, category filter pills, search input
│   └── settings.css      # Profile forms, toggle switches, theme cards
├── js/
│   ├── api.js            # Enterprise API client, JWT manager, session validator
│   ├── icons.js          # Standalone embedded Lucide icon library (SVG generator)
│   ├── mock-data.js      # Enterprise state store & Web Crypto helper functions
│   ├── router.js         # Client-side hash router with strict route guards
│   ├── app.js            # Core orchestrator, toast manager, modals, mobile drawer
│   ├── landing.js        # Canvas particle lattice animation in hero section
│   ├── auth.js           # Form validation, password meter, API login/register flow
│   ├── dashboard.js      # 24h traffic Canvas chart and telemetry counters
│   ├── chat.js           # Contacts search, message sending & simulated replies
│   ├── security.js       # Handshake simulation engine & ephemeral key generator
│   ├── files.js          # Drag-and-drop upload, encryption progress, download feedback
│   ├── logs.js           # Audit table filtering, keyword search, SQLite sync
│   └── settings.js       # Profile updater with API sync, policy toggles
└── server/
    ├── server.js         # Main HTTP server entrypoint & CORS dispatcher
    ├── routes.js         # API endpoint controllers (register, login, me, logout, logs)
    ├── auth.js           # Scrypt hashing, constant-time verification, JWT signing
    ├── db.js             # SQLite DatabaseSync engine with WAL mode & schemas
    ├── static.js         # Path-traversal protected static file delivery
    ├── test-auth.js      # Network socket integration test suite
    └── test-auth-memory.js # Sandboxed in-memory test harness
```

---

## 🚀 How to Run the Application & Backend Server

The application includes a zero-dependency enterprise backend powered by Node.js native modules (`node:http`, `node:sqlite`, `node:crypto`).

### Quick Start (Single Command)

From the project root directory, run:

```bash
node server/server.js
```
*(or `npm start`)*

This boots both:
1. **The Web Application:** Accessible at `http://localhost:3000`
2. **The Cryptographic Auth REST API:** Accessible at `http://localhost:3000/api`
3. **SQLite Persistence Engine:** Stored at `server/data/quantum_safe.db`

---

## 🧪 Automated Authentication Test Suite

Run the full end-to-end integration and unit test suite:

```bash
node server/test-auth-memory.js
```

This tests and verifies:
* User registration with password criteria validation
* Salted Scrypt key derivation and hash verification
* Rejection of duplicate email registrations (409 Conflict)
* Rejection of invalid password challenges (401 Unauthorized)
* Successful authentication and JWT token issuance (200 OK)
* Protected route guard authorization on `/api/auth/me` with Bearer tokens
* User profile updating and SQLite persistence
* Tamper-evident audit trail recording in SQLite

---

## 🔐 Authentication & Security API Reference

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create new post-quantum user identity with salted Scrypt hash & ML-KEM-768 key representation |
| `POST` | `/api/auth/login` | Public | Authenticate identity via constant-time password verification & issue HS256 JWT |
| `GET` | `/api/auth/me` | Bearer Token | Retrieve authenticated user profile, PQC fingerprint, and session state |
| `POST` | `/api/auth/logout` | Bearer Token | Invalidate session, scrub memory buffers, and log audit event |
| `PUT` | `/api/auth/profile` | Bearer Token | Update user identity parameters (name, organization, role) |
| `GET` | `/api/logs` | Bearer Token | Retrieve tamper-evident security audit logs from SQLite |
| `GET` | `/api/health` | Public | Service health and telemetry status check |

---

## 🔮 Future Backend & Cryptography Integration Roadmap

The frontend code architecture has been prepared to facilitate clean, modular integration with backend services and production post-quantum libraries:

1. **Backend API Layer (Node.js & Express):**
   * REST endpoints for authentication (`/api/auth/login`, `/api/auth/register`).
   * REST endpoints for file uploads (`/api/files/upload`) using streaming chunk encryption.
   * REST endpoints for audit event querying (`/api/logs`).
2. **Database (MongoDB & Redis):**
   * MongoDB schemas for user identity, contact relations, and encrypted message archives.
   * Redis for in-memory session caching and rate-limiting.
3. **Real-Time Messaging (Socket.IO):**
   * Replace local simulated responses in `js/chat.js` with WebSocket events (`socket.emit('send-message')`, `socket.on('receive-message')`).
4. **Post-Quantum Cryptography Integration:**
   * **Client-Side (WebAssembly):** Integrate `liboqs-js` or official NIST FIPS 203 WebAssembly implementations to generate true ephemeral ML-KEM-768 public/private keys in the browser.
   * **Payload Encryption:** Integrate the browser's native **Web Crypto API** (`crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data)`) using the derived 256-bit shared secret.
   * **Hardware Tokens:** Integrate WebAuthn for post-quantum FIDO2 passkeys with ML-DSA signatures.

---

## ⚖️ Cryptographic Implementation Standards

> **Implementation Notice:**
> The frontend incorporates native browser **Web Crypto API** (`crypto.getRandomValues`, `crypto.subtle.digest`) for true local cryptographic entropy, real SHA-256 file hashing, and persistent local identity management. Phase 2 extends this with WebAssembly-compiled ML-KEM-768 lattice matrix calculations and Web Crypto AES-256-GCM payload cipher streams.
