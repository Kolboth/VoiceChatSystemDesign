# Voice-First Community Chat — Figma Make Master Build Instruction

> **Purpose:** Paste this entire document into Figma Make to generate a polished, production-minded, browser-first voice chat application inspired by the usefulness of Mumble, but with a significantly more modern UX and visual system.
>
> **Primary goal:** Build a complete interactive web-app prototype and implementation foundation — not a static concept, not a marketing landing page, and not a Discord clone.
>
> **Product character:** fast, quiet, spatially efficient, voice-first, desktop-first, technically credible, highly reusable, and intentionally free of generic AI-generated “slop UI.”

---

# 0. OPERATING INSTRUCTIONS FOR FIGMA MAKE

You are acting as a **senior product designer, design-system architect, frontend engineer, realtime-product specialist, and accessibility reviewer**.

Do not immediately improvise screens.

First:

1. Read this entire instruction.
2. Create a concise internal execution plan.
3. Audit the current Make file / attached design context before creating anything.
4. Reuse existing tokens, components, icons, utilities, and patterns when they already satisfy the requirements.
5. Do not create duplicate components under slightly different names.
6. Build in the ordered phases defined near the end of this document.
7. After every phase, audit what already exists before proceeding.
8. Keep a single coherent design language across every screen.
9. Prefer reusable component architecture over one-off screen-specific markup.
10. The final output must feel like one product designed by one strong team.

If the environment supports **Plan Mode**, use it before implementation.

Do not replace working components merely because another implementation is possible.

Do not create visual variations without a functional reason.

---

# 1. PRODUCT DEFINITION

Build a browser-first voice community product with the working name:

**Resonance**

The name is temporary and should be implemented through a reusable product-name constant/token so it can easily be changed later.

The product combines:

- Mumble-like persistent voice rooms
- Discord-like communities and permissions
- Slack Huddle-like instant rooms
- modern spatial voice-room presentation
- excellent audio-device visibility
- extremely fast room switching
- lightweight text support
- clear connection-state feedback
- strong moderator controls

Voice is the primary interaction.

Text chat is secondary.

Do **not** design this as a text-chat app with voice added on.

---

# 2. IMPLEMENTATION BASELINE

Use the following stack unless the existing Figma Make environment requires an equivalent:

## Frontend

- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui conventions
- Base UI primitives where appropriate
- Lucide icons
- Motion / motion-react only for purposeful interaction animation
- CSS variables / semantic design tokens
- responsive layout
- keyboard-accessible interactions

## Voice / realtime integration target

Architect the frontend for:

- LiveKit open source
- WebRTC audio
- LiveKit React components
- room connection context
- remote participant audio
- microphone publishing
- speaking detection
- connection quality
- participant metadata
- room data / realtime events

Important:

Create a clean abstraction boundary such as:

`src/features/voice/voice-provider.tsx`

`src/features/voice/use-voice-room.ts`

`src/features/voice/types.ts`

`src/features/voice/livekit-adapter.ts`

The product UI must not be tightly coupled to hardcoded LiveKit markup.

If credentials or a realtime server are unavailable in the Make environment:

- create a realistic mock realtime adapter
- preserve the same public interface
- make it easy to replace the mock adapter with LiveKit
- do not pretend mock behavior is real networking
- clearly separate demo data from production integration

## Backend, authentication, social and persistence target

This product is intended to become a **real private voice-chat application for the user and their friends**, not only a UI prototype.

Use a Supabase-compatible architecture as the preferred implementation baseline:

- Supabase Auth for authentication
- PostgreSQL for persistent application data
- Row Level Security concepts for user-scoped data
- Supabase Realtime where useful for social presence and app events
- LiveKit open source for realtime voice transport
- a protected server endpoint / server function for generating LiveKit access tokens

If the current Figma Make runtime can connect to Supabase, implement the real integration.
If it cannot, build the UI plus typed service adapters so mocks can later be replaced without rewriting the product.

Authentication and social relationships are **first-class product features**, not placeholders.

Persistent data should include:

- users / profiles
- auth sessions handled by the auth provider
- friendships
- friend requests
- blocks
- presence
- communities
- rooms
- memberships
- roles
- permission overrides
- direct conversations
- direct messages
- call sessions / lightweight call history
- invitations
- user settings
- notification preferences

Do not expose database service-role keys, LiveKit secrets, or privileged credentials in client-side code.

Do not build unnecessary backend complexity merely to make the prototype appear “complete.”

---

# 3. NON-NEGOTIABLE VISUAL DIRECTION

## Core philosophy

This product must look:

- modern
- calm
- dense but readable
- highly intentional
- tactile without being decorative
- technical without looking developer-only
- premium without luxury clichés
- friendly without becoming playful or childish

Aim for the product-quality feeling of tools such as:

- Linear
- Raycast
- Arc
- Vercel
- modern shadcn applications
- high-quality native desktop utilities

These are **quality references**, not layouts to copy.

---

# 4. STRICT “NO SLOP UI” RULES

Avoid the common visual signatures of generic AI-generated interfaces.

## DO NOT

Do not use:

- giant rounded floating cards for every section
- excessive 20–32 px border radius
- glassmorphism everywhere
- blurred translucent panels without a functional reason
- neon purple-to-blue gradients
- random decorative gradients
- huge marketing headings inside an authenticated application
- oversized whitespace that reduces information density
- excessive pill-shaped controls
- pills for ordinary labels
- cards nested inside cards nested inside cards
- unnecessary “stat cards”
- fake charts
- decorative dashboard metrics
- stock illustrations
- random 3D shapes
- glowing orbs
- abstract mesh backgrounds
- gratuitous shadows
- floating sidebars detached from window edges
- every surface having a border
- every element having a background container
- gigantic profile avatars
- giant empty hero sections
- generic “Welcome back, Alex 👋” dashboard content
- placeholder analytics unrelated to voice communication
- rainbow status colors
- excessive badges
- multiple competing accent colors
- excessive icon use
- text labels duplicated beside obvious icons when space is constrained
- meaningless microcopy
- AI-assistant visual language
- chatbot bubbles as a default application structure
- novelty skeuomorphism
- copied Discord layout proportions

## INSTEAD

Use:

- clear hierarchy
- restrained surfaces
- 1 px separators
- subtle tonal contrast
- compact control groups
- precise spacing
- small radius values
- semantic typography
- contextual tooltips
- purposeful menus
- visible hover/focus states
- excellent empty states
- clear audio feedback
- meaningful motion
- layout density appropriate for desktop communication software

Every visual element must earn its place.

---

# 5. DEFAULT THEME

Build both:

- Dark theme — primary
- Light theme — complete secondary theme

The dark theme should not be pure black.

## Suggested semantic color foundation

Do not hardcode colors directly in components.

Use semantic tokens.

Example dark theme direction:

- `--background`: near-black neutral with slight cool bias
- `--surface-1`: subtle elevation above background
- `--surface-2`: hover / selected containers
- `--surface-3`: popover / dialog surface
- `--border-subtle`
- `--border-strong`
- `--text-primary`
- `--text-secondary`
- `--text-tertiary`
- `--accent`
- `--accent-hover`
- `--success`
- `--warning`
- `--danger`
- `--info`

Accent:

Use a restrained cool indigo / periwinkle family.

Avoid oversaturated electric purple.

Speaking activity should use the accent or a dedicated clear “live” semantic color.

Do not make every online user green.

Online presence and speaking state are separate concepts.

---

# 6. DESIGN TOKENS

Create a coherent token system.

## Spacing

Use a 4 px base rhythm.

Preferred values:

- 2
- 4
- 6
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Avoid arbitrary spacing values unless necessary for optical correction.

## Radius

Keep radii restrained.

Suggested:

- `xs`: 4 px
- `sm`: 6 px
- `md`: 8 px
- `lg`: 10 px
- `xl`: 12 px
- `round`: 9999 px only for avatars, dots, switches, segmented indicators, or truly circular elements

Do not use 16–32 px radius on every panel.

## Typography

Use a clean variable sans font available to the project.

Preferred priority:

1. Inter
2. Geist Sans
3. system UI fallback

Type hierarchy should be compact.

Suggested desktop scale:

- 12 — metadata / helper
- 13 — dense interface label
- 14 — default UI text
- 15 — emphasized body / selected room
- 16 — section heading
- 18 — page / room heading
- 22 — major settings title
- 28 — onboarding title only

Do not use 40–64 px application headings.

Use tabular numerals where latency, counts, durations, or levels are displayed.

## Elevation

Prefer tonal separation before shadows.

Use shadows primarily for:

- menus
- popovers
- command palette
- dialogs
- floating device panel

No shadow should look like a soft marketing-card shadow.

---

# 7. APPLICATION INFORMATION ARCHITECTURE

Create these main areas:

```text
Authentication
├── Sign in
├── Create account
├── Forgot password
└── First audio setup

Application
├── Home
│   ├── Recent rooms
│   ├── Friends / contacts
│   └── Active rooms
│
├── Community
│   ├── Voice rooms
│   ├── Text rooms
│   ├── Member directory
│   └── Community settings
│
├── Direct
│   ├── Direct messages
│   └── Direct calls
│
└── Settings
    ├── Account
    ├── Voice & Audio
    ├── Appearance
    ├── Notifications
    ├── Keybinds
    ├── Privacy
    └── Advanced
```

---

# 8. GLOBAL APPLICATION SHELL

Desktop is the primary target.

Build a four-zone application shell.

```text
┌──────┬────────────────────┬──────────────────────────────────┬──────────────────┐
│ Rail │ Room / Nav Sidebar │ Main Content                     │ Context Panel    │
│      │                    │                                  │ optional         │
│      │                    │                                  │                  │
│      │                    │                                  │                  │
│      │                    │                                  │                  │
│      │                    │                                  │                  │
├──────┴────────────────────┴──────────────────────────────────┴──────────────────┤
│ Persistent Voice / User Controls                                               │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Zone A — Community rail

Approximately 52–64 px.

Contains:

- Home
- Direct
- community icons
- add community
- discover / join
- settings access if appropriate

Use compact icons.

Selected state should be obvious without a giant colored background.

Support:

- tooltip on hover
- unread indicator
- active voice indicator
- drag/reorder visual placeholder if prototype scope allows

## Zone B — Navigation sidebar

Approximately 240–280 px.

Contains:

- community title
- dropdown menu
- optional invite button
- channel groups
- voice rooms
- text rooms
- collapsible room categories

The sidebar must be easy to scan.

Voice-room hierarchy should visually communicate:

- room name
- occupancy
- lock/private status
- live participants
- current user location

Avoid heavy separators between every row.

## Zone C — Main content

Flexible width.

The main content changes based on selected destination.

For voice rooms, the main content should be a purpose-built voice canvas.

## Zone D — Context panel

Approximately 280–320 px.

Optional and collapsible.

May show:

- members
- room details
- activity
- thread / lightweight room text chat
- selected user profile
- moderation controls

Do not force it open by default on narrow laptop widths.

## Bottom connection strip

Persistent whenever the user is connected to voice.

It is one of the most important UI areas.

---

# 9. VOICE CONNECTION STRIP

Create a reusable component:

`VoiceConnectionStrip`

States:

- disconnected
- connecting
- connected
- reconnecting
- degraded
- failed

Connected example hierarchy:

```text
VOICE CONNECTED
Design Lounge · Product Guild
38 ms · Excellent

[Mic] [Deafen] [Device] [Disconnect]
```

The strip must communicate:

- connection state
- current room
- current community
- latency
- connection quality
- microphone state
- deafen/output state
- disconnect action

Avoid making it visually loud.

Use semantic status color only where useful.

When reconnecting:

- do not replace the entire app with a spinner
- show state locally
- preserve room context
- disable controls that cannot currently function
- provide retry if reconnect fails

---

# 10. AUDIO DEVICE QUICK PANEL

Clicking microphone/device controls should open a compact panel.

Component:

`AudioDevicePanel`

Include:

## Microphone

- selected microphone dropdown
- live input level meter
- mute toggle
- input volume
- mic test
- automatic gain
- noise suppression
- echo cancellation

## Output

- selected output device
- output volume
- deafen toggle
- test output

## Advanced shortcut

- open full Voice & Audio settings

Do not make this a full-page dialog.

Use a popover / anchored panel on desktop.

---

# 11. VOICE ROOM EXPERIENCE

Voice rooms are the central differentiator.

Component:

`VoiceRoom`

The voice-room header contains:

- room name
- room topic / purpose
- participant count
- privacy state when relevant
- invite
- room options

Main voice area:

Represent participants as compact spatial tiles or rows depending on density.

## Small rooms: 2–8 users

Use a comfortable participant grid.

Each participant tile may include:

- avatar
- display name
- speaking visual
- mute state
- moderator-muted state
- hand raised
- streaming / screen share state
- connection warning
- local-user indicator

Do not turn cards into oversized video-conference tiles.

Audio-only participants do not need huge rectangles.

## Medium rooms: 9–24 users

Switch to a denser responsive grid.

## Large rooms: 25+

Use a compact list/grid hybrid.

Prioritize:

1. current speaker
2. recently active speakers
3. moderators when relevant
4. remaining participants

Support search/filter in very large rooms.

---

# 12. PARTICIPANT TILE SYSTEM

Create one canonical component:

`ParticipantTile`

Do not make separate components for every visual state.

Use composable state props.

Required props/state:

- avatar
- displayName
- username optional
- isLocal
- isSpeaking
- isMuted
- isDeafened
- isServerMuted
- hasRaisedHand
- isModerator
- isOwner
- connectionQuality
- volume
- isIdle
- isAFK
- screenShareActive
- contextMenuAvailable

## Speaking state

Speaking feedback must be unmistakable but restrained.

Preferred behavior:

- accent ring
- subtle border emphasis
- tiny waveform / level visualization
- name emphasis

Avoid large glowing neon halos.

## Local user

Use a subtle “You” label.

## Muted

Show microphone-off icon.

Do not reduce opacity so heavily that the user appears disabled.

---

# 13. ACTIVE SPEAKER BEHAVIOR

When someone speaks:

- speaking indicator activates quickly
- indicator should decay naturally after speech stops
- do not aggressively reorder the grid for every syllable
- if speaker prioritization is enabled, use stable movement
- respect reduced-motion preferences

For a room presentation mode, optionally provide:

- `Grid`
- `Focus`
- `Compact`

These are actual layouts, not decorative view buttons.

---

# 14. ROOM TYPES

Support two conceptual types.

## Persistent room

Examples:

- Lobby
- General
- Gaming
- Design
- Music
- AFK

Persistent rooms belong to community structure.

## Instant room

Created ad hoc.

Fields:

- room name
- privacy
- maximum participants optional
- invite people
- optional topic

Instant rooms may disappear after the last person leaves.

Give instant rooms a subtle distinct icon.

Do not make them feel like a separate product.

---

# 15. CREATE ROOM FLOW

Use a small dialog or sheet.

Fields:

- Room name
- Room type
  - Persistent
  - Instant
- Privacy
  - Public
  - Community only
  - Invite only
- Participant limit
- Topic / description optional

Advanced section:

- speaking permissions
- bitrate / quality preset if exposed
- default role access

Keep the default flow simple.

Do not expose advanced audio networking terminology to normal users.

---

# 16. ROOM SIDEBAR ITEM

Component:

`RoomNavItem`

Variants:

- voice
- text
- announcement
- instant
- private

States:

- default
- hover
- selected
- connected
- unread
- locked
- full
- disabled

Voice room row can expand to display active participants underneath.

Example:

```text
▾  Design Lounge                         4
   ◉ Dara
   ◉ Alex                         muted
   ◉ Mina
   ◉ You
```

Do not create nested cards for participants.

Keep it list-like.

---

# 17. TEXT CHAT — SECONDARY FEATURE

Include lightweight text chat because voice communities need:

- links
- room notes
- quick messages
- shared resources
- coordination

But text should not dominate the product.

Create:

`MessageList`

`MessageGroup`

`MessageComposer`

Support:

- grouped consecutive messages
- mentions
- replies
- reactions
- code formatting
- links
- edited marker
- system events
- room join/leave events when useful

Avoid bubble-chat visual style for community messages.

Use compact Slack/Discord-like message grouping, but with original visual treatment.

---

# 18. HOME

The Home screen should not be an analytics dashboard.

Use practical information.

Sections may include:

## Continue talking

Recently joined rooms.

Each entry:

- room
- community
- who is currently inside
- join button

## Active now

Rooms where friends / followed users are currently speaking.

## Recent contacts

People recently spoken with.

## Invitations

Pending community or room invitations.

Do not add meaningless KPI cards.

No “12 communities / 248 friends / 99% uptime” cards.

---

# 19. USER PROFILE

Create a compact profile surface.

Fields:

- avatar
- display name
- username
- presence
- short status
- mutual communities
- roles relevant to current community
- local volume control
- mute locally
- message
- call
- moderation actions when authorized

Profile should appear in:

- popover
- context panel

Do not force a full page for simple inspection.

---

# 20. PRESENCE SYSTEM

Presence states:

- Online
- Away
- Do not disturb
- Invisible / Appear offline
- Offline

Voice-specific state is separate:

- In voice
- Speaking
- Muted
- Deafened

Do not mix presence and voice activity into one overloaded status dot.

---

# 21. PERMISSIONS

Start with understandable role presets.

Default roles:

- Owner
- Admin
- Moderator
- Member
- Guest

Permission categories:

## Community

- manage community
- manage roles
- invite members
- remove members

## Rooms

- create rooms
- edit rooms
- delete rooms
- move members

## Voice

- connect
- speak
- mute members
- deafen members
- priority speaker
- stream / share screen

## Text

- view
- send
- delete own
- moderate messages

Build:

`RoleRow`

`PermissionMatrix`

`PermissionToggle`

`PermissionInheritedState`

Permission values must support:

- allow
- inherit/default
- deny

Clearly distinguish inherited permissions from explicit permissions.

Do not build a visually overwhelming matrix by default.

Use grouped sections.

---

# 22. MODERATION

Participant context menu for authorized users:

- view profile
- message
- adjust local volume
- mute locally
- move to room
- server mute
- disconnect from voice
- timeout
- kick
- ban

Destructive actions require confirmation where appropriate.

Server mute must be visually distinguishable from self-mute.

Always display why an action is disabled.

---


# 22A. AUTHENTICATION, FRIENDS, DMS & DIRECT CALLS — REQUIRED CORE SYSTEM

This section overrides any earlier instruction that treats authentication, friends, direct messages, or calling as optional.

The primary personal use case is:

> Two or more real users create accounts, add each other as friends, see each other's permitted presence, send direct messages, and start private voice calls.

The product is not complete if it merely displays a fake Friends screen.

---

## 22A.1 REAL AUTHENTICATION

Preferred provider:

**Supabase Auth**

Support:

- email + password sign up
- email + password sign in
- email verification when enabled
- forgot password
- reset password
- persistent sessions
- refresh / restored sessions
- sign out
- authenticated route protection
- unauthenticated redirect
- session-expired state
- account deletion flow
- optional Google OAuth only if it can be added cleanly without weakening the email/password flow

Do not require social login for MVP.

### Auth architecture

Create:

```text
src/features/auth/
├── auth-provider.tsx
├── auth-service.ts
├── auth-guard.tsx
├── use-auth.ts
├── types.ts
└── components/
```

Conceptual interface:

```ts
interface AuthController {
  user: AuthUser | null
  profile: UserProfile | null
  status: "loading" | "authenticated" | "unauthenticated"

  signUp(input: {
    email: string
    password: string
    displayName: string
    username: string
  }): Promise<void>

  signIn(input: {
    email: string
    password: string
  }): Promise<void>

  signOut(): Promise<void>

  requestPasswordReset(email: string): Promise<void>

  updatePassword(password: string): Promise<void>
}
```

Do not import auth-provider SDK calls throughout arbitrary UI components.

Consume the shared auth layer.

### Auth routing rules

Unauthenticated users attempting to open the application must go to Sign In.

Authenticated users visiting Sign In or Create Account should go into the app.

While restoring a session:

- do not flash the sign-in page
- render an intentional loading shell
- do not temporarily expose authenticated content before auth state is known

If the session expires during use:

- block privileged actions
- request authentication again
- preserve local navigation context where reasonable
- do not silently discard unsaved user input

---

## 22A.2 USER PROFILE

Each authenticated account maps to an application profile.

```ts
type UserProfile = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  bio?: string
  presence: "online" | "away" | "dnd" | "offline"
  createdAt: string
}
```

Requirements:

- username is unique
- display name does not need to be unique
- user can upload/change avatar
- user can edit display name
- user can edit short bio/status
- user can copy username
- unavailable username has a clear validation state
- auth ID and profile ownership are securely related

Do not expose private email addresses in public profile search.

---

## 22A.3 FRIEND RELATIONSHIP MODEL

Friend states:

```text
none
outgoing-request
incoming-request
friends
blocked
```

Use dedicated persistent records.

Conceptual model:

```ts
type FriendRequest = {
  id: string
  senderId: string
  receiverId: string
  status: "pending" | "accepted" | "declined" | "cancelled"
  createdAt: string
}

type Friendship = {
  id: string
  userAId: string
  userBId: string
  createdAt: string
}
```

Do not allow duplicate mirrored friendships.

Friend request actions:

- Send
- Accept
- Decline
- Cancel

Friend actions:

- Message
- Call
- Invite to room
- View profile
- Remove friend
- Block

Blocked user actions:

- Unblock

Removing a friend is not the same as blocking them.

---

## 22A.4 ADD FRIEND

Create an `Add friend` flow based on exact username/profile search.

Flow:

```text
Friends
→ Add friend
→ Search username
→ Result
→ View profile if desired
→ Send friend request
```

States:

- searching
- no result
- result found
- already friends
- outgoing request already pending
- incoming request already pending
- blocked
- request sent
- failure

Do not expose private user data through search.

---

## 22A.5 FRIENDS HOME

Create a dedicated Friends experience.

Filters:

- Online
- All
- Pending
- Blocked

Friend row:

- avatar
- display name
- username
- presence
- optional voice activity if privacy permits
- Message
- Call
- overflow menu

Pending should contain:

- incoming requests
- outgoing requests

Incoming row actions:

- Accept
- Decline
- Profile

Outgoing row actions:

- Cancel request
- Profile

Use compact list UI.

Do not turn each friend into a giant card.

---

## 22A.6 PRESENCE

Presence states:

- Online
- Away
- Do not disturb
- Offline

Presence is distinct from:

- In voice
- In call
- Speaking
- Muted
- Deafened

Presence must tolerate:

- tab close
- network loss
- stale websocket/realtime connections
- multiple logged-in devices

Do not expose precise friend activity to users who are not allowed to see it.

---

## 22A.7 DIRECT MESSAGES

Accepted friends can have persistent direct conversations.

Conceptual model:

```ts
type DirectConversation = {
  id: string
  participantIds: string[]
  createdAt: string
}

type DirectMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  editedAt?: string
}
```

MVP:

- send text
- receive text
- timestamps
- unread state
- edit own message
- delete own message
- retry failed send
- empty conversation state
- blocked communication state

Optional later:

- typing indicator
- reactions
- attachments

The conversation header must include:

- friend identity
- presence
- Call
- Profile

Direct messaging supports coordination around voice; do not let it overwhelm the product.

---

## 22A.8 1:1 DIRECT VOICE CALLS

A friend must be able to call another friend directly.

Use the same underlying LiveKit transport abstraction as community voice, but model direct calls as their own product flow.

Call states:

```text
idle
outgoing-ringing
incoming-ringing
connecting
connected
reconnecting
ended
declined
missed
busy
failed
```

Create reusable components:

- `DirectCallProvider`
- `IncomingCallSurface`
- `OutgoingCallSurface`
- `DirectCallPanel`
- `CallControls`
- `CallDuration`
- `CallParticipant`

### Starting a call

Allow from:

- Friend row
- Friend profile
- Direct conversation

Conceptual flow:

```text
Caller clicks Call
→ create call session
→ recipient receives realtime incoming-call event
→ recipient accepts or declines
→ backend verifies both participants
→ backend issues authorized LiveKit connection credentials
→ both clients connect
```

Never place privileged LiveKit secrets in the browser.

### Incoming call

Incoming call surface:

- avatar
- display name
- `Incoming voice call`
- Accept
- Decline

It should remain available while navigating inside the app.

Do not make it a tiny toast that can easily be missed.

### Outgoing call

Show:

- avatar
- display name
- Ringing…
- Cancel

### Connected direct call

Show:

- friend avatar
- name
- call duration
- speaking state
- connection quality
- microphone
- deafen/output
- device picker
- end call

Audio-only calls should not look like empty video conferencing grids.

### Call ending/error states

Support:

- caller cancelled
- recipient declined
- remote ended
- missed
- busy
- blocked
- microphone permission denied
- connection failed
- reconnecting
- failed reconnect

Use explicit copy.

---

## 22A.9 SMALL GROUP DIRECT CALLS

Architect the social layer so private group calls can be added without a redesign.

A small group call may be started from:

- a small direct group conversation
- an `Add people` action from a 1:1 conversation
- a temporary friend group

Reuse:

- participant components
- audio controls
- connection state
- device selection
- speaking indicators

Do not create a second unrelated visual system for group calls.

MVP may implement 1:1 calls first, but the architecture must not prevent group calls.

---

## 22A.10 CALL SESSION MODEL

Persist lightweight call metadata.

```ts
type CallSession = {
  id: string
  initiatorId: string
  participantIds: string[]
  type: "direct" | "group" | "community"
  status:
    | "ringing"
    | "connected"
    | "ended"
    | "declined"
    | "missed"
    | "failed"
  startedAt: string
  connectedAt?: string
  endedAt?: string
}
```

A direct conversation may display lightweight events:

- `Voice call · 14 min`
- `Missed call`
- `Call declined`

Do not create invasive behavioral analytics.

---

## 22A.11 AUTHORIZED LIVEKIT TOKEN FLOW

Use this security model:

```text
Authenticated browser
      │
      ▼
Protected server endpoint / server function
      │
      ├─ verify user session
      ├─ verify friendship / call participation
      ├─ verify community membership when joining community rooms
      └─ verify room permission
      │
      ▼
Generate short-lived LiveKit access token
      │
      ▼
Return token + LiveKit server URL
      │
      ▼
Client connects via LiveKit SDK
```

Requirements:

- never embed LiveKit API secret in client code
- never generate privileged access tokens directly in client code
- verify membership before community-room token issue
- verify call participants before direct-call token issue
- use short-lived credentials where practical
- handle token/session expiry
- expose failures to the user clearly

Create a typed client contract:

```ts
interface VoiceTokenService {
  getCommunityRoomToken(roomId: string): Promise<{
    token: string
    serverUrl: string
  }>

  getDirectCallToken(callId: string): Promise<{
    token: string
    serverUrl: string
  }>
}
```

---

## 22A.12 DATABASE AUTHORIZATION / RLS

When using Supabase/PostgreSQL, assume Row Level Security or equivalent server-side authorization.

A user may only read/write:

- their private account data
- their own editable profile fields
- permitted public profile fields
- friend requests they sent or received
- friendships they participate in
- blocks they own
- direct conversations they participate in
- direct messages in those conversations
- call sessions they participate in
- communities/rooms their membership permits
- settings they own

Client-side hidden controls are **not security**.

The backend must enforce authorization.

---

## 22A.13 SOCIAL PRIVACY

Add privacy settings:

### Friend requests

- Everyone
- Nobody

Future-ready:

- Friends of friends

### Direct calls

- Friends
- Nobody

### Presence

- Friends
- Appear offline

### Room invitations

- Friends
- Nobody

### Block list

- blocked users list
- unblock action

Defaults should be privacy-conscious.

---

## 22A.14 SOCIAL NOTIFICATIONS

Support in-app realtime notifications for:

- friend request received
- friend request accepted
- direct message
- incoming voice call
- missed call
- room invitation

Browser push notifications are optional for MVP.

Architect the notification service so push can be added later.

Incoming calls must work in-app while the site is open.

---

## 22A.15 SERVICE LAYER

Create dedicated typed service boundaries:

```text
src/features/auth/
src/features/social/
src/features/direct-messages/
src/features/calls/
src/features/voice/
```

Suggested interfaces:

```ts
interface SocialService {
  searchUsers(query: string): Promise<UserProfile[]>
  sendFriendRequest(userId: string): Promise<void>
  acceptFriendRequest(requestId: string): Promise<void>
  declineFriendRequest(requestId: string): Promise<void>
  cancelFriendRequest(requestId: string): Promise<void>
  removeFriend(userId: string): Promise<void>
  blockUser(userId: string): Promise<void>
  unblockUser(userId: string): Promise<void>
}

interface DirectMessageService {
  listConversations(): Promise<DirectConversation[]>
  listMessages(conversationId: string): Promise<DirectMessage[]>
  sendMessage(conversationId: string, body: string): Promise<void>
}

interface DirectCallService {
  startCall(friendId: string): Promise<CallSession>
  acceptCall(callId: string): Promise<void>
  declineCall(callId: string): Promise<void>
  endCall(callId: string): Promise<void>
}
```

Do not put Supabase queries directly inside visual components.

---

## 22A.16 TWO-USER END-TO-END DEMO REQUIREMENT

The project must be testable with two separate authenticated user contexts.

Demonstrate:

```text
User A signs up
User B signs up

User A searches User B
→ sends request

User B sees incoming request
→ accepts

Both now appear as friends

User A opens conversation
→ sends a message

User B receives message

User A clicks Call

User B sees incoming call
→ accepts

Both enter the same authorized voice session

User A speaks
→ User B sees speaking state

Either user ends call
→ both leave the call cleanly
```

If the Make environment cannot provision real backend credentials during generation:

- provide clearly separated mock adapters
- preserve the exact service interfaces
- provide setup instructions
- do not claim real multi-user networking is functioning until configured

---


# 23. SETTINGS

Use a proper settings information architecture.

Desktop pattern:

```text
Settings sidebar | Settings content
```

Avoid putting every setting inside separate floating cards.

Settings groups:

## User settings

- Account
- Profiles
- Privacy
- Notifications
- Appearance

## App settings

- Voice & Audio
- Keybinds
- Language
- Accessibility
- Advanced

## Voice & Audio page

Must be comprehensive.

Sections:

### Input

- input device
- input level
- input volume
- microphone test
- input mode

Input mode:

- Voice activity
- Push to talk

For voice activity:

- sensitivity
- auto/manual threshold

For push to talk:

- keybind
- release delay

### Processing

- echo cancellation
- noise suppression
- automatic gain control

### Output

- output device
- output volume
- sound test

### Behavior

- mute when app loses focus optional
- join sounds
- leave sounds
- speaking notifications
- attenuation

### Diagnostics

- current connection quality
- latency
- packet-loss placeholder / adapter data
- selected region if relevant
- reconnect button
- troubleshooting link

Diagnostics should look technical but approachable.

---

# 24. FIRST-RUN AUDIO SETUP

After account creation, guide the user through a short microphone setup.

Steps:

## 1. Microphone permission

Explain clearly why permission is needed.

States:

- unknown
- prompting
- granted
- denied
- no device detected

## 2. Choose microphone

Show input devices.

Include live level meter.

## 3. Choose output

Allow test sound.

## 4. Input behavior

- Voice activity
- Push to talk

## 5. Finish

Show concise summary.

Do not use five giant onboarding illustrations.

Use product UI itself as the visual.

---

# 25. AUTHENTICATION

Screens:

- Sign in
- Create account
- Forgot password
- Reset password
- Invite acceptance

Keep authentication minimal.

Do not design a generic split-screen SaaS login page with random abstract gradient art.

If a side visual is used, it must demonstrate the product:

Example:

A subtle realtime voice-room preview with active speakers.

Prefer a compact centered form on desktop.

---

# 26. EMPTY STATES

Create intentional empty states.

Examples:

## Empty community

Title:
`No rooms yet`

Description:
`Create a voice room for your community to start talking.`

Action:
`Create room`

## Empty voice room

Do not make the main area look broken.

Show:

- room identity
- empty participant state
- invite button
- concise prompt

## No microphone

Explain:

- no input device found
- refresh device list
- open device settings

## No search results

Show query context and clear filter action.

Avoid decorative cartoons.

---

# 27. ERROR STATES

Support:

- microphone permission denied
- microphone disconnected
- output device disconnected
- room full
- no permission to join
- invitation expired
- server unavailable
- failed authentication
- connection lost
- failed reconnect
- user removed from room
- user banned
- unsupported browser feature
- realtime service unavailable

Errors must be:

- specific
- actionable
- contextual

Avoid generic:

`Something went wrong`

when more information is available.

---

# 28. CONNECTION STATE MACHINE

Model connection state explicitly.

```text
idle
  ↓
connecting
  ↓
connected
  ↓
reconnecting
  ├── connected
  └── failed
```

Also support:

- disconnecting
- disconnected
- kicked
- banned

UI must react correctly to each state.

Example:

During `connecting`:

- show room being joined
- show progress state
- provide cancel

During `reconnecting`:

- preserve room UI
- show reconnect banner/strip
- prevent duplicate join actions

During `kicked`:

- remove from room
- show reason when available

---

# 29. MICROPHONE STATE MACHINE

Support:

```text
unknown
permission-required
ready
active
muted
server-muted
device-lost
error
```

Server muted overrides local intent.

If the microphone disappears:

- notify user
- automatically offer another available microphone
- do not silently publish from a different device without telling the user

---

# 30. RESPONSIVE BEHAVIOR

Primary desktop breakpoints:

- ≥ 1440
- 1200–1439
- 1024–1199

Tablet:

- 768–1023

Mobile:

- < 768

## Large desktop

Show:

- rail
- nav sidebar
- main
- optional context panel

## Laptop

Collapse context panel by default when needed.

## Tablet

Rail + main navigation can become a drawer.

Voice room remains central.

## Mobile

Use:

- top app bar
- main content
- bottom navigation / contextual controls
- room/member panels as sheets

On mobile:

- do not simply shrink the desktop sidebar
- do not show four columns
- voice controls must be thumb-friendly
- participant layout must remain readable
- device settings can use bottom sheets or full pages

---

# 31. KEYBOARD AND POWER-USER UX

This app should feel excellent for desktop users.

Support patterns for:

- `Cmd/Ctrl + K` command menu
- quick room switcher
- mute shortcut
- deafen shortcut
- push-to-talk configurable key
- search members
- open settings
- escape closes transient surfaces

Create:

`CommandPalette`

Commands:

- Switch room
- Join recent room
- Create room
- Mute microphone
- Deafen
- Open audio settings
- Invite member
- Open community settings

Avoid shortcut collisions with browser defaults.

---

# 32. ACCESSIBILITY

Meet WCAG AA as the minimum target.

Requirements:

- keyboard navigable
- visible focus ring
- semantic buttons
- semantic dialogs
- descriptive accessible names
- sufficient contrast
- no state conveyed only by color
- tooltips are supplemental, not required to understand core actions
- reduced motion support
- correct heading order
- screen-reader labels for audio state
- announcing connection-state changes
- distinguish self-muted and moderator-muted states

For level meters:

Provide an accessible text equivalent where needed.

---

# 33. MOTION

Motion should communicate state.

Allowed examples:

- subtle speaking indicator
- menu open/close
- sheet transitions
- layout reflow
- participant join/leave
- connection-state transition
- mute icon transition

Timing:

Generally 120–220 ms.

Do not animate:

- every hover
- large background objects
- continuous decorative gradients
- idle UI for no reason

Speaking visualizers may animate continuously only while audio activity exists.

---

# 34. ICON SYSTEM

Use Lucide icons consistently.

Do not mix:

- outline icon families
- filled emoji
- custom pseudo-icons

unless a specific product symbol is required.

Standardize sizes:

- 14
- 16
- 18
- 20
- 24

Default interface icon size should usually be 16 or 18.

---

# 35. COMPONENT ARCHITECTURE

Create reusable primitives.

## Foundation

- Button
- IconButton
- Input
- Textarea
- Select
- Combobox
- Checkbox
- RadioGroup
- Switch
- Slider
- Tooltip
- DropdownMenu
- ContextMenu
- Popover
- Dialog
- AlertDialog
- Sheet
- Tabs
- ScrollArea
- Separator
- Avatar
- Badge
- Progress
- Skeleton
- Toast / Sonner
- Command palette

## Product components

- AppShell
- CommunityRail
- CommunityRailItem
- NavigationSidebar
- ChannelGroup
- RoomNavItem
- ParticipantTile
- ParticipantCompactRow
- ParticipantGrid
- VoiceRoom
- VoiceRoomHeader
- VoiceConnectionStrip
- AudioDevicePanel
- AudioLevelMeter
- ConnectionQuality
- SpeakingIndicator
- PresenceIndicator
- RoomInviteDialog
- CreateRoomDialog
- MemberProfilePopover
- MemberContextMenu
- MessageList
- MessageGroup
- MessageComposer
- RoleRow
- PermissionMatrix
- DeviceSelect
- SettingsNav
- EmptyState
- InlineError
- ReconnectBanner
- CommandPalette

Do not create:

- `BlueButton`
- `SidebarButton2`
- `VoiceCardNew`
- `ParticipantCardSmall2`

Name components by semantic purpose.

---

# 36. COMPONENT VARIANT RULES

Use props / variants rather than duplicated files.

Example:

`Button`

Variants:

- primary
- secondary
- ghost
- outline
- destructive

Sizes:

- xs
- sm
- md
- lg
- icon

States:

- default
- hover
- active
- disabled
- loading
- focus-visible

For icon-bearing buttons:

Support:

- leadingIcon optional
- trailingIcon optional
- iconOnly

Do not hardcode icons inside generic buttons.

---

# 37. DATA MODEL — PROTOTYPE

Use realistic local/mock data.

## User

```ts
type User = {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  status?: string
  presence: "online" | "away" | "dnd" | "offline"
}
```

## Community

```ts
type Community = {
  id: string
  name: string
  iconUrl?: string
  ownerId: string
}
```

## Room

```ts
type Room = {
  id: string
  communityId: string
  name: string
  topic?: string
  kind: "voice" | "text" | "instant"
  privacy: "public" | "community" | "invite"
  participantLimit?: number
}
```

## Voice participant

```ts
type VoiceParticipant = {
  userId: string
  roomId: string
  isLocal: boolean
  isSpeaking: boolean
  isMuted: boolean
  isDeafened: boolean
  isServerMuted: boolean
  hasRaisedHand: boolean
  connectionQuality: "excellent" | "good" | "poor" | "unknown"
}
```

## Role

```ts
type Role = {
  id: string
  name: string
  priority: number
}
```

Use IDs and relational references.

Do not embed huge duplicated objects everywhere.

---

# 38. DEMO CONTENT

Create realistic example communities such as:

- Product Guild
- Night Shift
- Studio
- Friends

Rooms:

Product Guild:

- Lobby
- Design Lounge
- Engineering
- Research
- Quiet Focus
- AFK

Night Shift:

- General
- Ranked
- Strategy
- Chill

Do not use lorem ipsum.

Use human names from a globally diverse set.

Avoid making every demo user a tech-company archetype.

---

# 39. MAIN SCREENS TO BUILD

Build at minimum:

1. Sign in
2. Create account
3. First-run microphone permission
4. First-run microphone selection
5. First-run output selection
6. Home
7. Community voice-room default
8. Voice room with 2 participants
9. Voice room with 8 participants
10. Voice room with 24+ participants
11. Voice room while local user muted
12. Voice room while local user server-muted
13. Voice room reconnecting
14. Room access denied
15. Room full
16. Create room dialog
17. Invite members dialog
18. Member profile popover
19. Member moderation menu
20. Text room
21. Community member directory
22. Community settings overview
23. Role management
24. Permission management
25. Account settings
26. Voice & Audio settings
27. Appearance settings
28. Notifications settings
29. Keybind settings
30. Command palette
31. Empty community
32. Empty voice room
33. Mobile voice room
34. Mobile room navigation
35. Mobile voice controls
36. Tablet voice room

These can be represented as actual routes, states, or demo controls in the Make prototype.

Do not duplicate entire app implementations per state.

Use a debug/demo state switcher if helpful.

---

# 40. MAIN VOICE ROOM DESKTOP LAYOUT

Target approximately:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Design Lounge                                      6 participants │
│ Product Guild · Open room                  [Invite] [Room menu]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│   │ avatar           │  │ avatar           │  │ avatar         │ │
│   │ Dara             │  │ Mina             │  │ Alex           │ │
│   │ speaking         │  │                  │  │ muted          │ │
│   └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│   │ avatar           │  │ avatar           │  │ avatar         │ │
│   │ Vann             │  │ Sam              │  │ You            │ │
│   │                  │  │                  │  │                │ │
│   └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                    [Mute] [Deafen] [Device] [Leave]              │
└──────────────────────────────────────────────────────────────────┘
```

This diagram communicates hierarchy only.

Do not literally render ASCII-like boxed cards.

Actual visual treatment should be lighter and more refined.

---

# 41. VOICE CONTROL BAR

Create a central voice control group.

Controls:

- microphone
- deafen
- audio device
- raise hand optional
- screen share future-ready
- disconnect

Microphone button states:

- active
- muted
- permission missing
- device unavailable
- server muted

Disconnect is destructive but should not be oversized.

Use tooltips and shortcut hints.

---

# 42. DEVICE FAILURE UX

If the active microphone disconnects:

Show an inline notification:

`Microphone disconnected`

Supporting text:

`Select another input device to continue speaking.`

Actions:

- Select device
- Stay muted

Do not force page reload.

If output device disconnects:

- notify
- fall back only if safe/available
- identify current output

---

# 43. SEARCH

Global search should support:

- communities
- rooms
- members
- messages if text search is available

Use command-menu style interaction.

Local community search should filter:

- rooms
- members

Keep search results grouped by type.

---

# 44. INVITATIONS

Invite flow should support:

- invite specific member
- invite link
- expiration
- room-specific invite
- community invite

States:

- active
- copied
- expired
- revoked

Do not expose security-sensitive controls casually.

---

# 45. NOTIFICATIONS

Notification preference categories:

- mentions
- direct messages
- room invites
- community invites
- moderator actions
- friend activity optional
- voice join/leave sounds

Notification levels:

- all
- important
- none

Allow per-community override later.

---

# 46. LIGHT THEME

Light theme must be genuinely designed.

Do not merely invert colors.

Ensure:

- borders remain visible
- selected states stay subtle
- contrast remains strong
- shadows do not become heavy
- accent remains restrained
- voice activity remains clear

---

# 47. APPEARANCE SETTINGS

Include:

- theme
  - system
  - light
  - dark
- UI density
  - comfortable
  - compact
- participant layout default
- reduced motion
- sidebar participant visibility
- show room occupancy

If density is implemented:

Compact mode should meaningfully reduce:

- row height
- padding
- participant spacing

Do not simply shrink font size.

---

# 48. PERFORMANCE PRINCIPLES

The interface may show many users.

Avoid:

- excessive re-renders from speaking state
- rebuilding entire participant lists on audio activity
- expensive blur filters
- huge background images
- uncontrolled animation

Keep speaking indicator updates localized.

Large participant lists should be structured so virtualization can be added if needed.

---

# 49. CODE QUALITY RULES

Use:

- semantic components
- typed props
- hooks for reusable logic
- feature folders
- utility functions
- tokenized styling
- accessible primitives

Avoid:

- monolithic 1,000-line page components
- deeply duplicated Tailwind class strings
- arbitrary `z-index` escalation
- inline hardcoded color values
- one-off magic pixel offsets
- excessive absolute positioning
- giant local mock-data blobs inside page components

Suggested structure:

```text
src/
├── app/
├── components/
│   ├── ui/
│   └── common/
├── features/
│   ├── auth/
│   ├── communities/
│   ├── rooms/
│   ├── voice/
│   ├── messages/
│   ├── members/
│   ├── moderation/
│   └── settings/
├── hooks/
├── lib/
├── data/
├── types/
└── styles/
```

---

# 50. LIVEKIT INTEGRATION CONTRACT

Create an integration-ready voice API.

Example conceptual interface:

```ts
interface VoiceRoomController {
  state:
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnecting"
    | "disconnected"
    | "failed"

  roomId?: string

  participants: VoiceParticipant[]

  localParticipant?: VoiceParticipant

  microphoneDevices: MediaDeviceInfo[]
  outputDevices: MediaDeviceInfo[]

  selectedMicrophoneId?: string
  selectedOutputId?: string

  joinRoom(roomId: string): Promise<void>
  leaveRoom(): Promise<void>

  setMuted(value: boolean): Promise<void>
  setDeafened(value: boolean): Promise<void>

  selectMicrophone(deviceId: string): Promise<void>
  selectOutput(deviceId: string): Promise<void>
}
```

The UI should consume this contract rather than importing realtime SDK behavior into every component.

Create:

- mock adapter
- LiveKit adapter placeholder/integration layer

If LiveKit packages are available, use proper LiveKit React patterns.

Remote audio rendering should be handled globally at the voice-room provider level rather than one ad hoc audio element per screen.

---

# 51. MOCK REALTIME SIMULATION

For prototype quality, provide demo controls internally or through mock timing so reviewers can see:

- a participant starts speaking
- participant mutes
- participant joins
- participant leaves
- connection becomes poor
- local user reconnects

Do not expose obvious debug UI to normal users.

A hidden development/demo panel is acceptable.

Example:

`?demo=voice-states`

---

# 52. SECURITY UX

Never display secrets in UI.

Do not hardcode real service credentials.

Token generation must conceptually happen server-side.

Prototype code may use fake tokens only when clearly marked mock/demo.

Permission changes must not rely only on hidden UI controls; assume authorization must also be enforced by backend.

---

# 53. CONTENT STYLE

Tone:

- concise
- calm
- useful
- direct

Avoid:

- “Awesome!”
- “Supercharge”
- “Revolutionize”
- “Level up”
- “Seamlessly collaborate”
- “Unlock the power”
- “Your communication, reimagined”
- emoji-heavy system messages

Good:

`Microphone access is blocked`

`Allow microphone access in your browser settings, then try again.`

Bad:

`Oops! It looks like we can't hear you 😢`

---

# 54. BUTTON COPY

Prefer verbs.

Good:

- Join room
- Leave room
- Create room
- Invite people
- Save changes
- Test microphone
- Retry
- Copy invite link

Avoid vague:

- Continue
- Proceed
- Submit

when the actual action can be named.

---

# 55. LOADING STATES

Use skeletons for:

- sidebar loading
- room list
- member list
- text history

Use spinners only for:

- small direct actions
- join action
- save action

Do not place a giant center-screen spinner for the entire authenticated app unless startup truly cannot render anything else.

---

# 56. TOAST RULES

Use toast for:

- copied invite
- settings saved when not otherwise obvious
- device switched
- moderation action completed

Do not toast:

- every navigation event
- every mute/unmute action
- actions already clearly reflected in UI

Use inline feedback where more appropriate.

---

# 57. CONTEXT MENUS

Use context menus for expert/secondary actions.

Participant menu:

- profile
- message
- local volume
- local mute
- move
- moderation

Room menu:

- edit
- invite
- copy link
- notification settings
- delete if authorized

Do not hide primary actions only in context menus.

---

# 58. MEMBER DIRECTORY

Build a community member list with:

- search
- role filter
- presence filter
- compact rows

Row:

- avatar
- display name
- username
- role
- presence
- current voice room optional
- actions

Avoid large member cards.

---

# 59. COMMUNITY SETTINGS

Navigation:

- Overview
- Rooms
- Roles
- Members
- Invites
- Moderation
- Audit log optional

Overview:

- community name
- icon
- description
- default room
- system messages preference

No analytics dashboard unless real product requirements are later supplied.

---

# 60. DESTRUCTIVE SETTINGS

Community delete:

- explicit destructive zone
- confirmation
- typed community name only if needed

Role delete:

- show affected member count
- require reassignment if necessary

Room delete:

- explain permanence
- show connected users if relevant

---

# 61. MOBILE VOICE UX

Mobile voice room priorities:

1. room identity
2. current speakers
3. mute
4. deafen/output
5. disconnect
6. participant access
7. room navigation

Recommended structure:

```text
Top bar
Room title · people button

Participant area

Bottom voice controls
[Mic] [Deafen] [More] [Leave]
```

Room list opens as a sheet.

Member list opens as a sheet.

Do not put tiny desktop controls into mobile.

---

# 62. DESIGN QA CHECKLIST

Before calling implementation complete, audit every screen for:

## Hierarchy

- Is the primary action obvious?
- Is voice state always understandable?
- Is selected room obvious?
- Is user location obvious?

## Consistency

- same icon size rules
- same button rules
- same spacing rhythm
- same radius rules
- same menu treatment
- same typography

## Density

- no giant empty containers
- no redundant panels
- no oversized headings
- no excessive padding

## States

- hover
- focus
- pressed
- selected
- disabled
- loading
- error
- empty
- permission denied
- reconnecting

## Reuse

Search the codebase before creating any new component.

If an existing component can support a requirement with a clean variant:

extend it.

Do not duplicate it.

---

# 63. COMPONENT DUPLICATION AUDIT

Before every new component is created:

1. Search by semantic purpose.
2. Search related names.
3. Search visually similar components.
4. Determine whether a variant can satisfy the use case.
5. Only create a new component if behavior or semantics are meaningfully different.

At the final audit, detect and merge:

- duplicate buttons
- duplicate modal wrappers
- duplicate sidebar rows
- duplicate participant tiles
- duplicate user rows
- duplicate status indicators
- duplicate empty-state wrappers
- duplicate device selectors

Do not preserve duplication merely because it already exists.

Clean it up safely.

---

# 64. STYLE DUPLICATION AUDIT

Find repeated arbitrary styling such as:

- repeated background values
- repeated border colors
- repeated radius values
- repeated shadows
- repeated padding patterns

Move repeated values into:

- tokens
- variants
- shared utilities

Do not over-abstract one-use values.

---

# 65. ACCESSIBILITY AUDIT

Test conceptually:

- keyboard-only navigation
- visible focus
- dialogs trap focus
- menus have arrow-key behavior
- command palette works by keyboard
- buttons have names
- icon buttons have labels
- speaking status has accessible text
- mute state has accessible text
- status color has icon/text equivalent
- destructive controls are distinguishable
- contrast meets AA
- reduced motion respected

---

# 66. RESPONSIVE AUDIT

Verify:

## 1600 px

No excessive line length.

Main voice room does not become comically wide.

## 1366 px

All core controls fit.

Context panel can collapse.

## 1024 px

No horizontal overflow.

Navigation remains usable.

## 768 px

Tablet layout intentionally adapts.

## 390 px

Mobile voice room fully usable.

No desktop sidebar squeezed onto mobile.

---

# 67. PRODUCT ACCEPTANCE CRITERIA

The build is successful only if:

1. A new user can create an account.
2. They can complete microphone setup.
3. They can reach Home.
4. They can select a community.
5. They can view room structure.
6. They can join a voice room.
7. They can clearly see who is speaking.
8. They can mute and unmute.
9. They can deafen.
10. They can change devices.
11. They can leave voice.
12. They understand reconnecting state.
13. They can create a room.
14. They can invite another user.
15. Moderators can access appropriate actions.
16. Settings include full audio configuration.
17. Desktop, tablet, and mobile layouts are coherent.
18. Components are reusable.
19. No obvious duplicated component system exists.
20. The UI avoids generic AI SaaS styling.
21. Light and dark themes both work.
22. Accessibility basics are implemented.
23. Mock realtime logic can later be swapped with LiveKit.
24. The application feels voice-first.

---

# 68. PHASED EXECUTION PLAN

Follow these phases in order.

Do not jump directly to finishing screens.

---

## PHASE 01 — FOUNDATION AUDIT

Tasks:

- inspect existing code
- inspect available attached Figma design context
- inspect installed components
- identify existing tokens
- identify duplicate patterns
- establish project structure

Output:

- short plan
- architecture decision
- list of reusable existing elements

Do not redesign anything yet unless required to normalize broken foundations.

---

## PHASE 02 — DESIGN TOKENS

Create:

- colors
- typography
- spacing
- radius
- elevation
- motion
- breakpoint conventions
- z-index layers

Implement dark and light theme foundations.

Audit contrast.

---

## PHASE 03 — UI PRIMITIVES

Build/normalize:

- buttons
- inputs
- selects
- menus
- dialogs
- sheets
- tooltips
- slider
- switch
- tabs
- avatar
- toast
- command
- scroll area

Ensure variants cover future product components.

---

## PHASE 04 — PRODUCT COMPONENTS

Build:

- CommunityRail
- NavigationSidebar
- ChannelGroup
- RoomNavItem
- ParticipantTile
- VoiceConnectionStrip
- AudioLevelMeter
- ConnectionQuality
- SpeakingIndicator
- PresenceIndicator

Test component states independently.

---

## PHASE 05 — APPLICATION SHELL

Build responsive shell:

- community rail
- room sidebar
- main content
- context panel
- persistent voice area

Test at desktop breakpoints.

No page-specific hacks.

---

## PHASE 06 — VOICE ROOM

Build:

- header
- participant layouts
- control bar
- speaker state
- mute/deafen states
- connection state
- room capacity variations

Add demo states for:

- 2 users
- 8 users
- 24+ users

---

## PHASE 07 — REALTIME ABSTRACTION

Create:

- voice provider
- controller interface
- mock adapter
- LiveKit adapter boundary

Connect UI to mock state.

Do not scatter realtime state through random page components.

---

## PHASE 08 — AUDIO DEVICE EXPERIENCE

Build:

- permission state
- device panel
- microphone level
- output selection
- test microphone
- device lost state
- audio settings page

---

## PHASE 09 — NAVIGATION + HOME

Build:

- Home
- recent rooms
- active rooms
- contacts
- invitations
- community navigation
- room switching

Avoid dashboard-KPI patterns.

---

## PHASE 10 — TEXT SUPPORT

Build:

- room text view
- messages
- message composer
- replies
- reactions
- system events

Keep voice product identity primary.

---

## PHASE 11 — MEMBERS + MODERATION

Build:

- member directory
- profile popover
- context menu
- local volume
- move user
- server mute
- kick
- ban
- confirmations

Permission-gate actions.

---

## PHASE 12 — COMMUNITY ADMINISTRATION

Build:

- overview
- rooms
- roles
- permissions
- members
- invites

Keep complexity progressive.

---

## PHASE 13 — REAL AUTH + PROFILE

Build/integrate:

- Supabase-compatible auth service
- AuthProvider
- protected routes
- sign in
- create account
- email verification state
- forgot password
- reset password
- session restoration
- sign out
- profile creation
- profile edit
- unique username validation

Do not implement authentication as a fake local boolean.

If credentials/configuration are unavailable, keep a clearly marked mock adapter behind the same service interface.

---

## PHASE 14 — FRIENDS + SOCIAL GRAPH

Build:

- Friends home
- Online / All / Pending / Blocked filters
- Add friend
- user search
- incoming request
- outgoing request
- accept
- decline
- cancel
- remove friend
- block
- unblock
- presence
- privacy-aware state

Connect UI to the typed social service.

---

## PHASE 15 — DIRECT MESSAGES

Build:

- direct conversation list
- direct conversation
- unread state
- message sending
- edit own message
- delete own message
- failed send / retry
- blocked communication state

Keep the implementation compact and voice-oriented.

---

## PHASE 16 — DIRECT VOICE CALLS

Build:

- call session service
- outgoing ringing
- incoming ringing
- accept
- decline
- cancel
- busy
- missed
- connecting
- connected
- reconnecting
- failed
- end call
- direct-call overlay / persistent call surface
- authorized LiveKit token service contract

Reuse existing participant and audio-device components.

Do not create duplicate audio control systems.

---

## PHASE 17 — AUTH ONBOARDING + AUDIO

Build:

- invite acceptance
- profile completion where needed
- microphone permission
- microphone onboarding
- device setup
- output setup

Make the first audio setup exceptionally clear.

---

## PHASE 18 — SETTINGS

Build:

- account
- voice/audio
- appearance
- notifications
- keybinds
- privacy
- blocked users
- advanced

Ensure Voice & Audio is the most complete settings area.

---

## PHASE 19 — MOBILE + TABLET

Adapt intentionally.

Do not just stack desktop columns.

Create:

- mobile app bar
- room sheet
- member sheet
- friends mobile view
- direct conversation mobile view
- incoming-call mobile surface
- active direct-call mobile surface
- mobile participant view
- mobile voice controls
- tablet layout

---

## PHASE 20 — EDGE STATES

Implement:

- loading
- empty
- denied permissions
- disconnected
- reconnecting
- room full
- invitation expired
- device lost
- banned
- kicked
- no results
- service unavailable
- auth session expired
- invalid password-reset link
- friend request conflict
- blocked user
- incoming call cancelled
- call declined
- call missed
- call busy
- direct-call connection failure

---

## PHASE 21 — MOTION + MICROINTERACTION

Add only purposeful motion.

Test reduced motion.

Do not add decorative animations.

---

## PHASE 22 — ACCESSIBILITY PASS

Audit:

- keyboard
- focus
- semantics
- contrast
- screen-reader labeling
- dialog behavior
- incoming-call accessibility
- status announcements

Fix findings.

---

## PHASE 23 — COMPONENT CLEANUP

Search entire project for:

- duplicate components
- near-duplicates
- repeated styles
- inconsistent variants
- hardcoded colors
- arbitrary radii
- spacing drift
- unused components
- duplicate audio controls
- duplicate friend/member rows
- duplicate call surfaces

Merge or delete safely.

Do not leave temporary experimental components.

---

## PHASE 24 — FINAL PRODUCT QA

Review the product as a user.

Test:

```text
User A sign up
→ restore authenticated session
→ profile setup
→ audio setup
→ Home
→ search User B
→ send friend request

User B sign up / sign in
→ receive friend request
→ accept

User A
→ open direct conversation
→ send message
→ start voice call

User B
→ receive incoming call
→ accept

Both users
→ connect to authorized direct voice session
→ speak
→ mute
→ device panel
→ reconnect state
→ end direct call

Then test
→ community
→ join room
→ speak
→ invite friend
→ member menu
→ settings
→ leave room
```

Also test:

- mobile
- light mode
- keyboard navigation
- connection failure

Fix inconsistencies.

---

# 69. FINAL VISUAL REVIEW — ANTI-SLOP TEST

Before completion, ask of every major screen:

### Could this be mistaken for an automatically generated SaaS dashboard?

If yes:

simplify it.

### Are there too many cards?

If yes:

remove containers and use layout hierarchy.

### Are radii too large?

If yes:

reduce them.

### Is empty space harming usability?

If yes:

increase density.

### Are there decorative gradients with no semantic purpose?

If yes:

remove them.

### Are ordinary controls unnecessarily pill-shaped?

If yes:

use standard compact controls.

### Are there too many status badges?

If yes:

replace with typography/icon hierarchy.

### Does the application visually prioritize voice?

If no:

rework the hierarchy.

### Does it look like Discord with different colors?

If yes:

revisit layout proportions and participant experience.

The goal is not novelty.

The goal is a highly coherent, useful, original voice communication product.

---

# 70. FINAL DELIVERABLE

When all phases are complete, the Figma Make project should contain:

- functional navigation
- working responsive prototype
- reusable component system
- dark theme
- light theme
- realistic demo data
- voice-room mock behavior
- realtime adapter architecture
- audio-device interaction
- real authentication and protected-route flows
- persistent user profiles
- friend requests and friends list
- presence and block states
- direct messages
- incoming/outgoing 1:1 voice-call flows
- authorized voice-token integration contract
- two-user end-to-end social/call demo path
- account/onboarding flows
- admin/role flows
- edge states
- accessibility states
- no duplicate component families
- no obvious visual debt

Provide a final implementation summary containing:

1. Components created
2. Routes/screens created
3. Realtime abstraction created
4. Mock behavior supported
5. LiveKit integration points
6. Responsive behavior implemented
7. Accessibility work completed
8. Remaining backend work
9. Known limitations
10. Final duplicate-component audit result

---

# 71. IMPORTANT CONTINUATION RULE

For any future request modifying this application:

1. inspect the existing implementation first
2. reuse existing components
3. preserve tokens
4. preserve design hierarchy
5. do not introduce a second style language
6. do not create duplicates to solve a local problem
7. extend the existing component API when reasonable
8. verify desktop and mobile behavior
9. verify dark and light themes
10. run a quick anti-slop review before finishing

This rule remains active for the lifetime of the project.

---


# 71A. AUTH + FRIENDSHIP + CALLING COMPLETION GATE

Before the product can be considered complete, verify all of the following:

- authentication is represented through a real provider/service architecture
- app routes are protected
- session restoration is handled
- two users can have independent profiles
- users can search one another without exposing private email data
- friend requests persist
- accepting a request creates a durable friendship
- removing a friend and blocking are distinct actions
- friends can open a direct conversation
- direct messages persist
- incoming calls are delivered as realtime app events
- direct calls have ringing, accept, decline, busy, missed, connecting, connected, reconnecting, and ended states
- LiveKit access is issued through an authenticated server-side token path
- direct-call participants are authorized before receiving voice access
- a client secret is never embedded in browser code
- both users can join the same direct-call room
- both users can mute/unmute and change audio devices independently
- ending a call cleans up call UI on both sides
- auth, friend, message, and call failures have explicit states
- mock adapters, if used, can be swapped without rewriting the UI

If any item above is missing, continue implementation instead of declaring the product finished.

---

# 72. START NOW

Begin with **PHASE 01 — FOUNDATION AUDIT**.

Do not attempt to generate the entire application as one uncontrolled page dump.

Work through the phases systematically.

Maintain the design system and application architecture throughout the build.

The end result should feel like a **serious modern voice application that could realistically become a production product**, not an AI-generated concept mockup.

This is a multi-user product. Do not optimize only for a single fake logged-in account. The implementation must be structured around real user identity, persistent friendships, and authorized user-to-user voice communication.
