# call — Minimalist Chat & Calling App

A production-ready web application for personal use that provides one-to-one text messaging, audio calls, video calls, and screen sharing — all deployable on free hosting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime |
| Calling | Native WebRTC (STUN only) |
| Hosting | Cloudflare Pages |

## Features

- 🔐 **Authentication** — Email/password signup & login via Supabase Auth
- 👥 **Contacts** — Search users, send/accept contact requests, manage contacts
- 💬 **Chat** — One-to-one realtime messaging with typing indicators, read receipts, unread counts
- 📞 **Audio Calls** — Pure WebRTC audio calling via Supabase Realtime signaling
- 📹 **Video Calls** — WebRTC video with local preview and remote video
- 🖥️ **Screen Sharing** — Share your screen during calls, switch back to camera
- 🔔 **Notifications** — Browser notifications for new messages and incoming calls
- 🌙 **Dark Mode** — Modern dark design inspired by WhatsApp
- 📱 **Responsive** — Works on mobile and desktop

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (free tier)
- A Cloudflare account (free tier)

### 1. Clone the project

```bash
git clone <your-repo-url> call
cd call
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Project Settings → API** to find your credentials

### 3. Run the database migration

1. Go to your Supabase project dashboard → **SQL Editor**
2. Open `supabase/migrations/00001_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run** to execute

Or use the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Enable Realtime:**
1. Go to **Database → Replication**
2. Ensure `messages`, `contacts`, and `call_signals` are in the `supabase_realtime` publication

### 4. Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Cloudflare Pages

**Build settings:**
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** (leave blank)

**Environment variables (set in Cloudflare dashboard):**
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

**Deploy steps:**
1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
3. Go to **Pages → Create a project → Connect to Git**
4. Select your repository
5. Configure the build settings above
6. Add the environment variables
7. Click **Save and Deploy**

## Project Structure

```
call/
├── index.html
├── vite.config.js              # Vite + Tailwind config
├── package.json
├── README.md
├── supabase/
│   └── migrations/
│       └── 00001_schema.sql    # Complete DB schema with RLS
└── src/
    ├── main.jsx                 # Entry point
    ├── App.jsx                  # Router & layout
    ├── index.css                # Tailwind + base styles
    ├── lib/
    │   └── supabase.js          # Supabase client
    ├── contexts/
    │   ├── AuthContext.jsx       # Auth state management
    │   ├── ChatContext.jsx       # Chat & messaging state
    │   └── CallContext.jsx       # WebRTC calling state
    ├── hooks/
    │   └── useNotifications.js   # Browser notifications
    ├── services/
    │   ├── auth.js              # Auth & profile API
    │   ├── contacts.js          # Contacts API
    │   ├── messages.js          # Messages API
    │   └── callSignaling.js     # WebRTC signaling via Realtime
    ├── components/
    │   ├── auth/
    │   │   ├── LoginForm.jsx
    │   │   └── RegisterForm.jsx
    │   ├── chat/
    │   │   ├── ChatWindow.jsx
    │   │   ├── MessageList.jsx
    │   │   └── MessageInput.jsx
    │   ├── call/
    │   │   ├── AudioCall.jsx
    │   │   ├── VideoCall.jsx
    │   │   └── IncomingCall.jsx
    │   └── layout/
    │       └── Sidebar.jsx
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── Contacts.jsx
        ├── Chat.jsx
        └── Settings.jsx
```

## Architecture

### Authentication Flow
1. User registers with email, password, and username
2. Supabase Auth creates the user
3. A database trigger auto-creates a `profiles` row
4. User logs in, auth state managed via `AuthContext`

### Chat Flow
1. Messages sent via Supabase insert
2. Realtime subscription pushes new messages instantly
3. Unread counts tracked per sender
4. Typing indicators via Realtime broadcast
5. Messages auto-mark as read when chat is active

### Calling Flow
1. Caller initiates call → sends SDP offer via Supabase Realtime
2. Receiver gets notification via Realtime subscription
3. Receiver accepts → creates answer, sends back via Realtime
4. ICE candidates exchanged through Realtime broadcast
5. Peer-to-peer connection established (STUN only)
6. Screen sharing uses `getDisplayMedia()` + track replacement

## Security

Row Level Security (RLS) is enabled on all tables:
- Profiles: readable by all, writable by owner
- Contacts: readable/writable by owner
- Messages: readable by participants, writable by sender
- Call signals: readable by participants, writable by caller

## License

MIT
