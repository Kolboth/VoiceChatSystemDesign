# Phase F release checklist

Phase F removes the last runtime mock-data path and adds responsive navigation,
keyboard command UX, the voice member inspector, LiveKit-driven participant
motion, and accessibility refinements.

## Database and server

Apply migrations in timestamp order, including:

- `20260830000100_realtime_channels_and_rls_hardening.sql`
- `20260830000200_livekit_unified_voice.sql`
- `20260830000300_text_channels.sql`

Deploy `supabase/functions/server` after setting the LiveKit secrets documented
in `env.example.txt`. Never expose the LiveKit API secret in a `VITE_*` value.

## Build

```text
pnpm install
pnpm build
```

## Manual acceptance gate

Use two browser profiles with different accounts and verify:

1. Send and receive text-channel messages in real time.
2. Join the same community voice room, hear both directions, mute/deafen, switch
   devices, disconnect/reconnect, and observe participant join/leave states.
3. Start, accept, decline, and end a direct call.
4. Use Cmd/Ctrl+K, arrow keys, Enter, Escape, M, and D without a mouse.
5. Check 375px mobile, 768px tablet, 1024px laptop, and desktop layouts.
6. Check dark/light themes and reduced-motion mode.

The production build can be deployed after this real-service acceptance gate.
