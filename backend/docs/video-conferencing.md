# Video Conferencing — Architecture & Implementation Guide

## Current Status

> **Status: Planned — Implementation in Progress**
>
> Video conferencing is listed as a core MedInternia feature. This document
> provides the technology decision, architecture, and setup guide for
> contributors working on this feature.

---

## Technology Decision

After evaluating options, MedInternia will use **[Daily.co](https://daily.co)** for video conferencing.

### Why Daily.co?

| Option | Verdict | Reason |
|---|---|---|
| **Daily.co** | ✅ **Selected** | Free tier (2000 participant-minutes/month), WebRTC-based, simple REST API, no infra to manage |
| Self-hosted WebRTC (Janus/mediasoup) | ❌ | Requires TURN/STUN servers, complex infra, not suitable for a GSSoC project |
| Agora | ❌ | Free tier limited, billing starts quickly |
| Twilio Video | ❌ | No free tier |
| Jitsi Meet (embedded) | 🔄 Alternative | Self-hostable, fully open source — viable if Daily.co is rejected |
| Zoom SDK | ❌ | Requires paid plan for production use |

> **Alternative:** If you prefer fully open source, [Jitsi Meet](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/)
> can be embedded via iframe with no API key. See the Jitsi alternative section below.

---

## Architecture
Frontend (Next.js)
↓ Join room request
Backend (Express.js)
↓ Create meeting room via Daily.co REST API
↓ Returns room URL + participant token
Frontend
↓ Embeds Daily.co iframe with the room URL
Daily.co CDN (WebRTC)
↔ Peer-to-peer video/audio

---

## Environment Variables

Add these to `backend/.env` and `backend/.env.example`:

```bash
# ─── Video Conferencing (Daily.co) ────────────────────────────────────────────
# Get your free API key at: https://dashboard.daily.co/developers
# Free tier: 2,000 participant-minutes/month — sufficient for development
DAILY_API_KEY=your_daily_co_api_key_here
DAILY_API_URL=https://api.daily.co/v1
```

Add to `frontend/.env.local`:

```bash
# Daily.co (public — safe to expose in browser)
NEXT_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
```

---

## Backend Implementation

### 1. Install the Daily.co SDK

```bash
cd backend
npm install @daily-co/daily-js
```

### 2. Create `backend/src/services/videoService.ts`

```typescript
// backend/src/services/videoService.ts
import axios from 'axios';

const DAILY_API_URL = process.env.DAILY_API_URL || 'https://api.daily.co/v1';
const DAILY_API_KEY = process.env.DAILY_API_KEY;

if (!DAILY_API_KEY) {
  console.warn('[Video] DAILY_API_KEY not set. Video conferencing will not work.');
}

const dailyHeaders = {
  Authorization: `Bearer ${DAILY_API_KEY}`,
  'Content-Type': 'application/json',
};

/** Create a new Daily.co room for a webinar or case discussion */
export async function createMeetingRoom(options: {
  name: string;       // Room name (e.g., 'case-123-discussion')
  expiryMinutes?: number;
}) {
  const expiry = Math.floor(Date.now() / 1000) + (options.expiryMinutes || 60) * 60;

  const response = await axios.post(
    `${DAILY_API_URL}/rooms`,
    {
      name: options.name,
      privacy: 'private',      // Require a token to join
      properties: {
        exp: expiry,
        enable_recording: false,  // Off by default for privacy
        max_participants: 50,
      },
    },
    { headers: dailyHeaders }
  );

  return response.data; // { id, name, url, ... }
}

/** Generate a participant token for a specific room */
export async function createParticipantToken(roomName: string, userId: string, isOwner: boolean) {
  const response = await axios.post(
    `${DAILY_API_URL}/meeting-tokens`,
    {
      properties: {
        room_name: roomName,
        user_id: userId,
        is_owner: isOwner,   // Owners can mute/remove participants
        exp: Math.floor(Date.now() / 1000) + 3600,  // Token expires in 1 hour
      },
    },
    { headers: dailyHeaders }
  );

  return response.data.token;
}

/** Delete a room when the meeting ends */
export async function deleteMeetingRoom(roomName: string) {
  await axios.delete(`${DAILY_API_URL}/rooms/${roomName}`, { headers: dailyHeaders });
}
```

### 3. Create `backend/src/routes/videoRoutes.ts`

```typescript
// backend/src/routes/videoRoutes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { createMeetingRoom, createParticipantToken } from '../services/videoService';

const router = Router();

// POST /api/video/rooms — Create a new meeting room
// Protected: only authenticated users can create rooms
router.post('/rooms', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, expiryMinutes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await createMeetingRoom({ name, expiryMinutes: expiryMinutes || 60 });
    const token = await createParticipantToken(room.name, req.user.id, true);

    return res.json({
      roomUrl: room.url,
      roomName: room.name,
      token,            // Participant token for this user
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create meeting room' });
  }
});

// POST /api/video/rooms/:roomName/join — Get a token to join an existing room
router.post('/rooms/:roomName/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;
    const token = await createParticipantToken(roomName, req.user.id, false);
    return res.json({ token });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to join meeting room' });
  }
});

export default router;
```

---

## Frontend Implementation

### Install Daily.co React SDK

```bash
cd frontend
npm install @daily-co/daily-react
```

### Create `frontend/src/components/VideoCall/VideoCall.tsx`

```tsx
// frontend/src/components/VideoCall/VideoCall.tsx
'use client';

import { DailyProvider } from '@daily-co/daily-react';
import DailyIframe from '@daily-co/daily-js';
import { useEffect, useRef } from 'react';

interface VideoCallProps {
  roomUrl: string;   // From backend POST /api/video/rooms response
  token: string;     // Participant token from backend
  onLeave?: () => void;
}

export function VideoCall({ roomUrl, token, onLeave }: VideoCallProps) {
  const callContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!callContainerRef.current) return;

    const call = DailyIframe.createFrame(callContainerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '8px',
      },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    call.join({ url: roomUrl, token });

    call.on('left-meeting', () => {
      call.destroy();
      onLeave?.();
    });

    return () => {
      call.destroy();
    };
  }, [roomUrl, token]);

  return (
    <div
      ref={callContainerRef}
      style={{ width: '100%', height: '600px' }}
      aria-label="Video call"
    />
  );
}
```

---

## Local Development Setup

### Step 1: Get a Daily.co API Key (Free)

1. Sign up at [dashboard.daily.co](https://dashboard.daily.co)
2. Go to **Developers** → **API Keys**
3. Copy your API key
4. Add to `backend/.env`: `DAILY_API_KEY=your_key_here`

### Step 2: Start the Backend and Test

```bash
cd backend
npm run dev

# Test room creation:
curl -X POST http://localhost:3000/api/video/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"name": "test-room", "expiryMinutes": 60}'
```

Expected response:
```json
{
  "roomUrl": "https://your-domain.daily.co/test-room",
  "roomName": "test-room",
  "token": "eyJ..."
}
```

---

## Jitsi Alternative (Fully Open Source)

If Daily.co is not preferred, Jitsi Meet can be embedded with no API key:

```tsx
// frontend/src/components/VideoCall/JitsiCall.tsx
export function JitsiCall({ roomName }: { roomName: string }) {
  return (
    <iframe
      src={`https://meet.jit.si/${roomName}`}
      allow="camera; microphone; fullscreen; display-capture"
      style={{ width: '100%', height: '600px', border: 'none' }}
      title="Video call"
    />
  );
}
```

Tradeoffs: No participant tokens (anyone who knows the room name can join), no programmatic participant management.

---

## Security Considerations

- **Never expose `DAILY_API_KEY` in frontend code** — all room creation must happen on the backend
- Participant tokens expire after 1 hour by default (configurable)
- Room names should be generated server-side (e.g., UUID), never accepted from user input directly
- Medical video calls should not be recorded without explicit patient/participant consent