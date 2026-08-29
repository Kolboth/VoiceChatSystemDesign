# Phase E — Quiet Precision UI/UX Modernization

This phase modernizes the existing working Resonance application without changing the Supabase/LiveKit architecture introduced in earlier phases.

## Design direction

**Quiet Precision**

- denser desktop-native hierarchy
- calmer neutral surfaces
- less decorative framing
- voice-first room presentation
- restrained accent use
- compact controls
- purposeful motion only
- reduced-motion support preserved
- no generic SaaS/dashboard styling

## Updated areas

### Design system / global UI

- Refined dark and light theme surface hierarchy.
- Added semantic `surface-0` through `surface-4` layers.
- Reduced visual noise from borders and shadows.
- Added shared Quiet Precision utility classes for sidebars, toolbars, raised overlays and voice stages.
- Added short page/panel entrance animation.
- Added real speaking-bar animation for participants.
- Kept `prefers-reduced-motion` handling.
- Tightened button/input interaction styling.

### Application shell

- Refined community rail and main workspace surfaces.
- Removed duplicated rail framing.
- Improved rail selected state and voice-presence indication.
- Kept existing navigation and provider ownership intact.

### Home

- Rebuilt Home around the product's real job: quickly finding someone or somewhere to talk.
- Added clear `Continue`, `Active now`, and `Your communities` hierarchy.
- Removed dashboard-like presentation.
- Connected actions still use existing real social/community data.

### Voice room

- Rebuilt room header and participant workspace.
- Added clearer live status, occupancy, speaking count and view controls.
- Improved Grid / Focus / Compact layouts.
- Added a quieter audio-stage treatment instead of conference-call-sized cards.
- Added improved join/empty-room experiences.
- Redesigned voice controls while preserving the actual VoiceRoomController calls.
- Audio-device panel still uses the same working media state.

### Participants

- Redesigned participant tiles and compact rows.
- Replaced glowing/pulsing visual treatment with restrained live edges and real speaking bars.
- Improved local-user, moderator, mute, deafen, AFK and connection-quality hierarchy.
- Removed emoji-based AFK/hand-state treatment from participant cards.

### Friends

- Converted the friends list into a denser native-style directory.
- Improved tab segmentation, list grouping and contextual actions.
- Actions remain accessible without relying exclusively on hover.
- Existing friend request/call/message functionality is unchanged.

### Direct messages

- Reworked message grouping, timestamps and composer density.
- Added clearer sending/failed message feedback.
- Refined conversation header and voice-call entry point.
- Existing Supabase realtime subscription and message writes remain unchanged.

### Direct calls

- Rebuilt the persistent call overlay into a compact utility surface.
- Improved incoming / outgoing / connecting / connected / ended state hierarchy.
- Preserved real mute, deafen, device selection, autoplay recovery and call lifecycle handlers.
- Removed duplicated connecting spinner from the previous UI.

### Authentication

- Removed the fake/mock voice-room preview from the authentication page.
- Replaced it with a minimal production-oriented auth experience.
- Existing sign-in, sign-up, password reset, confirmation and remember-me logic remains intact.

### Audio onboarding & settings

- Refined onboarding scale, progress and device selection styling.
- Refined Settings hierarchy without introducing card walls.
- Preserved real microphone/output behavior and diagnostics.

## Functional safety

This phase intentionally does **not** replace or refactor:

- Supabase auth
- social/RLS logic
- direct message persistence
- LiveKit room ownership
- token generation
- voice connection logic
- microphone/output switching
- call session persistence

The UI continues to invoke the same service/context actions.

## Mock status

The mock voice-room presentation formerly shown on the authentication page is removed.

`src/data/mock.ts` is still referenced by the legacy **text-room demo content** only. It is not used for community voice rooms or LiveKit participants.

## Validation completed in this environment

- Parsed all 27 TypeScript/TSX source files with the TypeScript parser: **PASS**.
- Searched for legacy mock community/room/occupancy usage in runtime source: **none found**.
- Full `npm install` / Vite production build could not be completed in this environment because package-registry access timed out.

## Required local validation

Run from the repo root:

```bash
pnpm install --no-frozen-lockfile
pnpm build
```

Then test with two authenticated browser profiles:

1. Sign in / sign up.
2. Open Friends.
3. Send/open a DM.
4. Start a direct call.
5. Accept from the second account.
6. Verify mute, deafen, device switching and end-call.
7. Join the same community voice channel from both accounts.
8. Verify speaking indication and participant states.
9. Switch Grid / Focus / Compact layouts.
10. Verify dark and light themes.
11. Verify reduced-motion preference.

## Recommended next UI pass

After real two-user testing, the next visual pass should focus on:

- responsive/mobile navigation architecture
- command palette / quick room switcher
- member inspector
- room moderation flows
- real text-room persistence (remove remaining text demo data)
- animation polish based on real LiveKit participant join/leave events
- accessibility QA and keyboard navigation pass
