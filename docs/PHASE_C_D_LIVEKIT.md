# Phase C/D — Unified LiveKit Voice Transport

This phase replaces the temporary PeerJS direct-call transport and the local-only voice-room capture path with one LiveKit transport shared by community voice channels and 1:1 direct calls.

## What changed

- `livekit-client` replaces `peerjs` in the browser.
- Community voice channels now request an authenticated LiveKit room token and connect to a real multi-user LiveKit room.
- Direct-call signalling is persisted in Supabase `call_sessions` and delivered through Supabase Realtime.
- Direct calls and community voice use the same microphone, output, mute, deafen, autoplay and reconnect implementation.
- Remote LiveKit audio tracks are attached globally inside `VoiceProvider`, so participant UI does not control whether audio is audible.
- LiveKit API credentials remain server-side in the Supabase Edge Function.

## Required Supabase migration

Apply:

```text
supabase/migrations/20260830000200_livekit_unified_voice.sql
```

It creates:

- `call_sessions`
- secure call-state RPCs
- RLS for call-session visibility
- Supabase Realtime publication for call signalling

## Required LiveKit configuration

Create either a LiveKit Cloud project or a self-hosted LiveKit deployment.

Set Supabase Edge Function secrets:

```bash
supabase secrets set LIVEKIT_URL=wss://YOUR-LIVEKIT-ENDPOINT
supabase secrets set LIVEKIT_API_KEY=YOUR_API_KEY
supabase secrets set LIVEKIT_API_SECRET=YOUR_API_SECRET
```

Recommended production CORS restriction:

```bash
supabase secrets set APP_ORIGIN=https://YOUR-PRODUCTION-DOMAIN
```

Do not put `LIVEKIT_API_SECRET` in `VITE_*` environment variables or client code.

Deploy the existing Edge Function after the update:

```bash
supabase functions deploy server
```

The frontend requests tokens through:

```text
POST /make-server-3cb311ed/voice/token
```

The Edge Function verifies the authenticated Supabase user and checks either:

- community + room access; or
- direct call participation and accepted-call status.

## Install dependencies

The repository now requires `livekit-client` and no longer uses `peerjs`.

Because this build environment could not reach the npm registry, regenerate the lockfile on a normal network connection:

```bash
pnpm install --no-frozen-lockfile
```

Then commit the updated `pnpm-lock.yaml`.

## Mandatory two-user test

Use two independent browser profiles or two devices.

### Community room

1. User A creates a community and voice channel.
2. User A invites User B.
3. Both open the same voice channel.
4. Both click Join room.
5. Verify both participants appear.
6. A speaks → B hears A and sees speaking state.
7. B speaks → A hears B and sees speaking state.
8. Test mute/unmute.
9. Test deafen/undeafen.
10. Test microphone switching.
11. Test speaker switching on browsers that support output selection.
12. Interrupt the network and verify reconnecting → connected.

### Direct call

1. A and B must be accepted friends.
2. A clicks Call.
3. B sees incoming call.
4. B accepts.
5. Both connect to the same LiveKit room.
6. Verify two-way audio.
7. Verify mute/deafen/device controls.
8. End from either side and verify both clients exit the voice session.
9. Repeat with B declining.
10. Repeat and allow the call to time out.

## Browser autoplay

If a browser blocks remote audio, the UI shows **Enable audio**. The action calls LiveKit `room.startAudio()` from the user interaction.

## Output selection

Custom speaker selection is feature-detected. Browsers without `setSinkId` continue to use the system-default output instead of treating output audio as broken.

## Remaining work before calling production complete

- Run `pnpm build` after refreshing the lockfile.
- Run two-user real-device tests across the target browsers.
- Configure a production LiveKit deployment/TURN path.
- Verify Supabase Edge Function secrets in staging and production.
- Add automated call-state tests.
- Proceed to the Quiet Precision UI/UX modernization only after the two-user media regression passes.
