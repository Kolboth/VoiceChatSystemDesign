# Production Audio Repair — Input, Output & Voice Reliability Audit

You are now performing a **production-readiness repair pass** on the existing voice-chat application.

## PRIMARY OBJECTIVE

The current microphone input and/or audio output functionality is not working correctly.

Your job is to:

1. Diagnose the existing implementation.
2. Trace the complete audio path.
3. Fix microphone input.
4. Fix remote audio playback.
5. Fix input-device switching.
6. Fix output-device switching where the browser supports it.
7. Add correct browser fallbacks where output selection is unavailable.
8. Fix LiveKit integration issues.
9. Fix permission and autoplay issues.
10. Handle devices connecting/disconnecting.
11. Remove mock behavior from production paths.
12. Harden the implementation for real multi-user production usage.
13. Test the complete flow with two authenticated users.
14. Do this **without redesigning the existing UI**.

Do not simply make the dropdowns visually appear functional.

The actual media devices and LiveKit tracks must work.

---

# 1. DO NOT REDESIGN

Preserve:

* current visual design
* existing layout
* current design tokens
* typography
* colors
* spacing
* components
* navigation
* responsive behavior

Only change UI when necessary to communicate:

* permissions
* unsupported browser capability
* device failure
* autoplay blocking
* loading
* connection status
* error
* recovery

Reuse existing components.

Before creating anything new, search for an existing component that can be extended.

---

# 2. START WITH A REAL CODE AUDIT

Before making changes, trace these flows in the current codebase.

## Microphone path

```text
User selects microphone
↓
Browser permission
↓
MediaDevices API
↓
Selected deviceId
↓
LiveKit active input device
↓
Local microphone track
↓
Track published
↓
Remote participant subscribes
↓
Remote participant hears audio
```

## Output path

```text
Remote participant publishes microphone
↓
LiveKit receives/subscribes to remote audio track
↓
Audio track attaches/renders
↓
Browser permits playback
↓
Selected/default audio sink
↓
User hears remote participant
```

Find exactly where either path breaks.

Do not patch symptoms without identifying the underlying issue.

---

# 3. REMOVE FAKE AUDIO LOGIC

Search for:

* hardcoded microphone device names
* hardcoded speaker names
* mock device arrays in production paths
* fake input volume animations
* timers pretending users are speaking
* `console.log()` pretending switching succeeded
* device dropdown state not connected to MediaDevices
* mute state that only changes an icon
* fake connection status
* remote participants without attached audio
* development LiveKit token servers
* placeholder access tokens
* hardcoded LiveKit tokens
* mock realtime adapters still active in production configuration

Mocks may remain only in explicitly isolated demo/development mode.

Production runtime must use real implementations.

---

# 4. SECURE-CONTEXT REQUIREMENT

Production audio must require HTTPS.

Detect:

```ts
window.isSecureContext
```

Also verify:

```ts
navigator.mediaDevices
```

If unavailable, do not fail silently.

Show an actionable error explaining that microphone access requires a secure supported browser environment.

Local development on `localhost` is acceptable.

Production must use HTTPS.

---

# 5. MICROPHONE PERMISSION FLOW

Use the modern API:

```ts
navigator.mediaDevices.getUserMedia({
  audio: true
})
```

Do not use deprecated:

```ts
navigator.getUserMedia()
```

Permission should normally be requested from a clear user action such as:

`Enable microphone`

or during the explicit microphone setup flow.

Handle at minimum:

```text
NotAllowedError
NotFoundError
NotReadableError
OverconstrainedError
AbortError
SecurityError
TypeError
```

Translate technical errors into useful product messages.

Example:

### Permission denied

Title:

`Microphone access is blocked`

Message:

`Allow microphone access in your browser settings, then try again.`

Action:

`Try again`

### No microphone

`No microphone detected`

`Connect a microphone and refresh the device list.`

### Device busy

`Microphone is unavailable`

`Another application may currently be using this microphone.`

---

# 6. REQUEST PERMISSION BEFORE FULL DEVICE ENUMERATION

Device labels may be unavailable before permission is granted.

Use the correct sequence:

```ts
await navigator.mediaDevices.getUserMedia({
  audio: true
})

const devices =
  await navigator.mediaDevices.enumerateDevices()
```

Then separate:

```ts
const inputs = devices.filter(
  device => device.kind === "audioinput"
)

const outputs = devices.filter(
  device => device.kind === "audiooutput"
)
```

Do not assume device labels will exist before permission.

---

# 7. CENTRALIZE DEVICE MANAGEMENT

Create or repair a single audio-device service.

Suggested architecture:

```text
src/features/voice/
├── voice-provider.tsx
├── livekit-adapter.ts
├── audio-device-service.ts
├── audio-permissions.ts
├── audio-playback.ts
├── audio-errors.ts
├── use-audio-devices.ts
└── types.ts
```

Do not duplicate MediaDevices logic across:

* onboarding
* settings
* call panel
* quick device menu
* room controls

All of these must use the same state/service.

---

# 8. AUDIO DEVICE STATE

Use explicit state.

```ts
interface AudioDeviceState {
  inputs: MediaDeviceInfo[]
  outputs: MediaDeviceInfo[]

  selectedInputId: string | null
  selectedOutputId: string | null

  inputPermission:
    | "unknown"
    | "prompt"
    | "granted"
    | "denied"

  outputSelectionSupported: boolean

  loading: boolean
  error: AudioDeviceError | null
}
```

Do not infer permission purely from whether a device exists.

---

# 9. LIVEKIT MICROPHONE ENABLEMENT

Verify that the actual LiveKit local participant microphone is enabled.

Use the installed/current LiveKit SDK API.

Conceptually:

```ts
await room.localParticipant.setMicrophoneEnabled(true)
```

Verify after execution:

* microphone publication exists
* microphone track exists
* track is not unexpectedly muted
* selected device corresponds to the intended microphone
* publication state is reflected in UI

Do not set `isMuted = false` in React state and assume the microphone is publishing.

The LiveKit track is the source of truth.

---

# 10. INPUT DEVICE SWITCHING

Use LiveKit's room device switching rather than only updating local UI state.

Conceptually:

```ts
await room.switchActiveDevice(
  "audioinput",
  selectedDeviceId
)
```

When not currently connected, persist the preference and apply it when creating/enabling the next microphone track.

After switching:

1. verify operation completed
2. update selected device state
3. confirm active device
4. persist preference
5. update UI

If switching fails:

* retain the previous working microphone
* show an error
* do not display the failed device as active

---

# 11. DO NOT CREATE MULTIPLE MICROPHONE STREAMS ACCIDENTALLY

Audit for repeated calls to:

```ts
getUserMedia()
```

Do not leave orphaned test streams running.

If a temporary stream is created only for permission/device testing:

```ts
stream
  .getTracks()
  .forEach(track => track.stop())
```

But do not stop a track currently being used by LiveKit.

Keep ownership explicit.

---

# 12. MICROPHONE LEVEL METER

The input meter must use real microphone audio.

Do not animate fake random values.

Use either:

* LiveKit track audio data
* Web Audio `AnalyserNode`
* another real track-level API supported by the existing implementation

The meter should represent RMS/level data with smoothing.

It must stop processing when:

* component unmounts
* microphone test stops
* active device changes
* track ends

Avoid leaking AudioContexts.

---

# 13. HANDLE LIVEKIT MEDIA DEVICE ERRORS

Listen for LiveKit media-device failures.

Handle:

* permission denied
* device missing
* device in use
* hardware failure

Use current LiveKit failure helpers/events where available.

Do not reduce every media failure to:

`Something went wrong`

Map failures to actionable messages.

---

# 14. HANDLE DEVICECHANGE

Register:

```ts
navigator.mediaDevices.addEventListener(
  "devicechange",
  handleDeviceChange
)
```

On device change:

1. enumerate again
2. diff the device list
3. determine whether selected input still exists
4. determine whether selected output still exists
5. update UI
6. recover safely

Remove the listener during cleanup.

---

# 15. MICROPHONE DISCONNECTED DURING CALL

If the active microphone disappears:

Do not crash the call.

Do not silently switch microphones without notifying the user.

State:

```text
Microphone disconnected
```

Actions:

```text
Select microphone
Stay muted
```

If an obvious system-default fallback exists, it may be suggested.

The user should remain connected and continue hearing others.

---

# 16. REMOTE AUDIO PLAYBACK — CRITICAL

Audit how remote LiveKit audio tracks are rendered.

Every subscribed remote audio track must ultimately be attached/rendered.

Use the appropriate LiveKit architecture already in the app.

Possible correct approaches include:

* centralized LiveKit room audio renderer
* track attachment via LiveKit
* another official LiveKit React audio rendering mechanism

Do not create participant UI without rendering participant audio.

Make remote audio rendering global to the active call/room where practical.

Do not rely on participant cards being mounted to make audio audible.

---

# 17. AUTOPLAY BLOCKING — CRITICAL

Browser autoplay policies can prevent remote audio from playing.

Listen for LiveKit's audio playback status.

Conceptually:

```ts
room.on(
  RoomEvent.AudioPlaybackStatusChanged,
  handleAudioPlaybackStatusChanged
)
```

Check:

```ts
room.canPlaybackAudio
```

If audio cannot play automatically, display a clear control:

`Enable audio`

That control must call:

```ts
await room.startAudio()
```

directly from a genuine click/tap interaction.

Do not call `startAudio()` only from:

* `useEffect`
* timers
* background callbacks

because browsers may reject it without user activation.

After playback succeeds, remove the prompt.

---

# 18. JOIN FLOW SHOULD COUNT AS AN AUDIO USER GESTURE WHEN POSSIBLE

When technically appropriate, use the user's explicit:

`Join room`

or:

`Accept call`

interaction to initiate permitted audio behavior.

Do not attempt invisible autoplay before meaningful user interaction.

If the browser still blocks playback, show `Enable audio`.

---

# 19. AUDIO OUTPUT SELECTION MUST USE FEATURE DETECTION

Do not assume every browser supports changing speakers.

Detect capabilities.

Examples:

```ts
const supportsSinkSelection =
  typeof HTMLMediaElement !== "undefined" &&
  "setSinkId" in HTMLMediaElement.prototype
```

Also feature-detect:

```ts
navigator.mediaDevices.selectAudioOutput
```

Never infer support merely from browser name.

---

# 20. OUTPUT SELECTION HAS TWO MODES

## Mode A — Browser supports explicit speaker selection

Allow selection of supported output devices.

Use browser-approved APIs and required user activation.

Depending on support:

```ts
await navigator.mediaDevices.selectAudioOutput()
```

and/or:

```ts
await audioElement.setSinkId(deviceId)
```

Apply the selected sink to **every remote audio renderer that requires it**.

If the architecture centralizes remote audio into a shared audio context/renderer, apply it centrally where supported.

Verify the audio actually moves to the selected output.

Do not merely store `selectedOutputId`.

## Mode B — Browser does not support output selection

Do not mark audio as broken.

Use:

`System default`

and allow the operating system/browser to choose output.

Disable or hide unsupported device-switch functionality appropriately.

Supporting copy can say:

`Output device selection is managed by your browser or system on this device.`

Do not show a broken speaker dropdown.

---

# 21. OUTPUT SELECTION REQUIRES USER PERMISSION

Where `selectAudioOutput()` is supported, invoke it from a genuine user interaction.

Do not call it automatically during page load.

Handle:

```text
NotAllowedError
NotFoundError
InvalidStateError
AbortError
```

If permission is denied, continue using system default output.

Do not prevent the user from joining the call solely because custom speaker selection is unavailable.

---

# 22. OUTPUT DEVICE DISCONNECT

If the selected headset/speaker disappears:

1. detect the device change
2. fall back safely to the default sink if possible
3. update state
4. notify the user

Example:

`Audio output changed`

`Your previous output device is no longer available. Audio is using the system default.`

Do not terminate the voice call.

---

# 23. TEST OUTPUT FUNCTION

The `Test output` action must play actual audio.

Use:

* a short bundled local tone/sample
* or a generated Web Audio tone

Do not depend on remote participants.

When custom sink selection is supported, the test must use the selected sink.

When not supported, test system-default output.

Stop the sound cleanly.

---

# 24. MUTE MUST CONTROL THE REAL TRACK

Audit microphone mute.

The UI state and LiveKit publication must stay synchronized.

Expected:

```text
User clicks Mute
↓
actual LiveKit microphone publication is muted/disabled
↓
remote participant stops receiving microphone audio
↓
local UI reflects muted state
```

Unmute is the inverse.

Do not implement mute by:

* reducing volume locally
* changing only an icon
* changing React state only

---

# 25. SERVER MUTE VS SELF MUTE

Keep these separate.

```text
Self muted
Server/moderator muted
Permission denied
Device unavailable
```

A server-muted user cannot simply unmute themselves through the local button.

The control should explain why.

---

# 26. DEAFEN MUST CONTROL PLAYBACK

Deafen must actually suppress remote audio locally.

It must not affect what other participants receive from the user's microphone unless your product specification intentionally combines mute + deafen behavior.

Define the behavior consistently.

When undeafening:

* restore audio
* respect selected output
* handle autoplay state if necessary

---

# 27. CALL / ROOM AUDIO LIFECYCLE

Audit cleanup.

On:

* leave room
* end direct call
* logout
* account switch
* failed call
* component teardown

clean up:

* LiveKit room listeners
* participant listeners
* attached remote audio tracks
* temporary local streams
* analyzers
* AudioContexts when owned by this feature
* devicechange listeners
* timers
* retries
* stale call state

Do not leave microphones active after the user has left.

---

# 28. PREVENT DUPLICATE CONNECTIONS

Audit React effects carefully.

React development behavior can expose bad lifecycle logic.

Ensure:

* one active LiveKit Room per intended voice session
* one connect attempt per call state
* one microphone publication
* one set of event listeners
* no duplicate token requests
* no repeated `getUserMedia()` loops
* no duplicated remote audio attachments

Use cleanup functions and stable ownership.

---

# 29. HANDLE RAPID USER ACTIONS

Protect against:

```text
Join → Leave → Join quickly
Mute → Unmute quickly
Device A → B → C quickly
Call → Cancel while connecting
Accept call twice
Reconnect while old connection is closing
```

Use:

* operation state
* cancellation where appropriate
* idempotent actions
* disabled transitional controls
* stale-request protection

Do not let old asynchronous operations overwrite newer state.

---

# 30. LIVEKIT CONNECTION EVENTS

Handle at minimum:

```text
connecting
connected
reconnecting
reconnected
disconnected
media device error
audio playback blocked
participant connected
participant disconnected
track published
track subscribed
track unsubscribed
active speakers changed
connection quality changed
```

Update product state from actual SDK events.

Do not fabricate realtime state.

---

# 31. PRODUCTION TOKEN SECURITY

Audit the LiveKit credential flow.

Production must be:

```text
Authenticated user
↓
Protected backend endpoint
↓
Verify Supabase session
↓
Verify friendship / room membership / call authorization
↓
Generate short-lived LiveKit token SERVER-SIDE
↓
Return token + server URL
↓
Connect
```

NEVER expose:

```text
LIVEKIT_API_SECRET
Supabase service_role key
database passwords
private signing secrets
```

in:

* frontend source
* `VITE_*`
* `NEXT_PUBLIC_*`
* client JavaScript
* browser storage

A LiveKit development token server is not acceptable for production.

---

# 32. AUTHENTICATION HARDENING

Verify:

* protected routes
* persistent session restoration
* expired-session behavior
* sign-out cleanup
* call authorization
* room authorization
* friend authorization

Do not allow an unauthenticated user to request production voice credentials.

---

# 33. SUPABASE PRODUCTION SECURITY

Audit all exposed application tables.

Enable RLS where appropriate.

Review both:

* table grants
* row-level policies

At minimum protect:

```text
profiles
friend_requests
friendships
blocks
direct_conversations
direct_conversation_members
direct_messages
call_sessions
call_participants
communities
community_members
rooms
room_permissions
user_settings
```

Test both allowed and denied operations.

Never depend on UI visibility as authorization.

---

# 34. RATE LIMIT / ABUSE PROTECTION

Production endpoints should protect against abuse.

Especially:

* sign-in attempts
* sign-up
* password reset
* username search
* friend requests
* direct messages
* call creation
* call ringing events
* LiveKit token generation
* community invitations

Do not let a client spam call-session or token endpoints unrestricted.

---

# 35. ENVIRONMENT CONFIGURATION

Separate environments:

```text
development
staging
production
```

Environment variables must have validation.

If required configuration is absent:

fail clearly during startup/deployment.

Do not silently fall back to mock production services.

---

# 36. REQUIRED AUDIO DIAGNOSTICS

Create a development/staging diagnostics surface.

Not visible to normal production users by default.

Show:

```text
Secure context
Browser media support
Mic permission
Current input
Current output
Output-selection support
LiveKit connection state
Room name
Local participant ID
Mic publication
Mic mute state
Remote audio tracks
Audio playback allowed
Latency
Connection quality
Last media error
```

Do not show:

* tokens
* credentials
* private keys
* raw authorization headers

Provide a `Copy diagnostics` action that automatically redacts sensitive values.

---

# 37. PRODUCTION LOGGING

Do not leave uncontrolled console spam.

Create structured logging levels:

```text
debug
info
warn
error
```

Development may use debug logs.

Production should record useful failures such as:

* call connection failure
* microphone failure
* playback failure
* reconnect failure
* token endpoint error

Never log:

* access tokens
* passwords
* auth headers
* service keys
* private message content unnecessarily

---

# 38. USER-FACING AUDIO TROUBLESHOOTING

Provide contextual recovery actions.

Examples:

### Can't hear others

Check:

* room is actually receiving remote audio
* user is not deafened
* audio playback is permitted
* output device exists
* system volume
* browser tab is not muted

Actions:

`Enable audio`

`Test output`

`Audio settings`

### Others can't hear me

Check:

* microphone permission
* microphone selected
* microphone publication
* self mute
* moderator mute
* input meter
* device availability

Actions:

`Select microphone`

`Test microphone`

`Allow microphone`

Do not use one generic troubleshooting message for all failures.

---

# 39. BROWSER COMPATIBILITY

Production target:

* Chrome current
* Edge current
* Firefox current
* Safari current on macOS
* Safari current on iOS
* Chrome current on Android

Test capability, not browser branding.

Especially expect differences around custom output-device selection.

If custom output switching is unavailable, system-default audio must still work.

The core requirement is:

**Every supported browser must be able to talk and hear.**

Choosing a specific speaker is an enhancement where supported.

---

# 40. MOBILE CONSIDERATIONS

On mobile:

* device enumeration may behave differently
* output routing may be system controlled
* Bluetooth routing may be controlled by OS
* Safari autoplay behavior may be stricter
* background-tab behavior may differ

Do not force desktop output-device semantics onto mobile browsers.

Keep:

* microphone
* mute
* voice playback
* call connection

reliable first.

---

# 41. AUDIO PREFERENCE PERSISTENCE

Persist appropriate non-sensitive preferences:

```text
preferred input device ID
preferred output device ID
input mode
input sensitivity
input volume
output volume
noise suppression setting
echo cancellation setting
automatic gain setting
```

But device IDs may become invalid.

On startup:

1. validate stored device
2. enumerate current devices
3. use it if available/permitted
4. otherwise fall back to default
5. update UI

Never fail the voice session because an old device ID no longer exists.

---

# 42. TWO-USER REAL TEST — MANDATORY

The repair is not complete until this works with two independent authenticated users.

Test:

```text
USER A
Chrome / Device A

USER B
Separate browser/profile/device
```

## Test 1 — Direct call

```text
A signs in
B signs in

A calls B

B receives incoming call

B accepts

Both connect
```

Then verify:

### A → B

* A speaks
* A's input meter moves
* A is marked speaking
* B hears A

### B → A

* B speaks
* B's input meter moves
* B is marked speaking
* A hears B

---

# 43. DEVICE-SWITCH TEST

While still connected:

For User A:

```text
Mic A
→ Mic B
```

Verify User B continues hearing User A after switch.

Then, where supported:

```text
Speaker A
→ Speaker B
```

Verify received audio moves to Speaker B.

No reconnect should be necessary unless the SDK/platform specifically requires it.

---

# 44. MUTE TEST

Verify:

```text
A mutes
→ B no longer hears A

A unmutes
→ B hears A again
```

Speaking indicators must agree with actual audio state.

---

# 45. DEAFEN TEST

Verify:

```text
A deafens
→ A stops hearing B

A undeafens
→ A hears B again
```

B's microphone should remain unaffected.

---

# 46. AUTOPLAY TEST

Test a browser/session where autoplay is initially blocked.

Expected:

```text
Call connects
↓
Remote audio blocked
↓
UI displays Enable audio
↓
User clicks
↓
room.startAudio()
↓
Remote audio begins
↓
Prompt disappears
```

This is mandatory.

---

# 47. PERMISSION-DENIED TEST

Block microphone access.

Expected:

* app remains stable
* user can still receive audio where permitted
* microphone state shows blocked
* clear instructions appear
* retry is available
* no endless permission-request loop

---

# 48. DEVICE-REMOVAL TEST

During a call:

Disconnect the active microphone.

Expected:

* call remains active
* user continues hearing remote audio
* microphone becomes unavailable/muted
* UI communicates loss
* another microphone can be selected

Disconnect active headset/output.

Expected:

* app updates device list
* safe fallback occurs where possible
* call remains active
* user is informed

---

# 49. NETWORK INTERRUPTION TEST

Temporarily interrupt networking.

Expected:

```text
connected
→ reconnecting
→ connected
```

or:

```text
connected
→ reconnecting
→ failed
```

While reconnecting:

* don't create a second room
* don't republish duplicate microphones
* don't duplicate call timers
* don't duplicate remote audio
* preserve current UI context

---

# 50. LOGOUT TEST

While connected to voice:

`Sign out`

must:

1. leave LiveKit room
2. stop microphone publishing
3. clean local media resources
4. remove listeners
5. clear call state
6. clear private cached data
7. invalidate session
8. route to authentication

The browser microphone indicator should no longer show active capture.

---

# 51. TEST AUTOMATION

Add tests where the current project setup supports them.

## Unit tests

Test:

* audio device reducer/state
* error mapping
* persisted device validation
* feature detection
* permission-state handling
* call state machine

## Integration tests

Test:

* Auth → protected app
* join room
* enable microphone
* mute/unmute
* call state
* device fallback

## Browser/E2E tests

Use Playwright or the existing E2E framework where practical.

Media hardware may need mocks in CI, but real-device staging testing is still mandatory.

---

# 52. TYPESCRIPT QUALITY

Production build must have:

* no unexplained TypeScript errors
* no unchecked `any` around audio APIs
* no ignored Promise rejections
* no swallowed media errors
* no unsafe forced casts used merely to silence compiler failures

Use feature-safe types for APIs that may not exist in every browser.

---

# 53. ERROR BOUNDARIES

An audio subsystem failure must not crash the whole application.

Contain failure appropriately.

A participant-card rendering problem should not terminate the LiveKit room.

A device-selection failure should not disconnect the user.

A diagnostics component failure should not affect media.

---

# 54. UI SOURCE OF TRUTH

Do not maintain parallel contradictory state.

Examples:

BAD:

```text
React says mic unmuted
LiveKit track says muted
```

BAD:

```text
Dropdown says AirPods
actual output = system speaker
```

BAD:

```text
Connection UI says Connected
room state = reconnecting
```

Prefer state derived from the real audio/realtime layer.

Optimistic state may be used temporarily, but reconcile it after the operation resolves.

---

# 55. OUTPUT FALLBACK RULE — IMPORTANT

Never treat lack of `setSinkId()` support as failure of audio output.

This distinction is mandatory:

```text
Can play audio
≠
Can programmatically choose a speaker
```

A browser can still play remote audio through the system-selected default output even when custom speaker routing is unavailable.

Reflect this correctly in both code and UI.

---

# 56. PERMISSIONS POLICY / DEPLOYMENT HEADERS

Review deployment configuration so it does not accidentally block audio features.

At minimum ensure microphone permissions are allowed for the correct first-party application context.

If speaker-selection permissions policy is configured, ensure it does not unintentionally block legitimate output-selection functionality.

Do not broadly grant media permissions to unrelated third-party origins.

---

# 57. PRODUCTION BUILD CHECK

Before completion run:

* package install integrity check
* TypeScript check
* lint
* production build
* tests
* dead-code check where available

Fix errors.

Do not declare something production-ready while the production build fails.

---

# 58. SECURITY CHECK

Before completion verify:

* no secret keys in repository/client bundle
* no LiveKit API secret exposed
* no Supabase service-role key exposed
* auth required for token generation
* RLS enabled and tested on exposed private tables
* production environment variables configured correctly
* no mock auth in production
* no mock LiveKit adapter in production
* no development token server in production
* authorization validated server-side
* rate limits considered for abuse-sensitive endpoints

---

# 59. PERFORMANCE CHECK

Voice interaction must remain responsive.

Avoid:

* rerendering the whole application on audio-level updates
* setting React state dozens of times per second globally
* expensive participant-grid animation on speaking updates
* multiple audio analyzers for the same track
* duplicate remote audio elements
* memory leaks from detached tracks

Keep high-frequency audio state localized.

---

# 60. PRODUCTION ACCEPTANCE GATE

Do NOT tell me the issue is fixed until all applicable checks below pass.

## Input

* microphone permission works
* real microphones enumerate
* selected microphone is actually active
* microphone publishes to LiveKit
* input meter uses real audio
* mute actually mutes the published track
* unmute restores audio
* input switching works
* unplugging microphone is handled
* denied permission is handled

## Output

* subscribed remote audio is rendered
* User A hears User B
* User B hears User A
* autoplay blocking is handled with user interaction
* system-default output always works where browser audio works
* custom speaker selection works only where supported
* unsupported speaker selection degrades gracefully
* selected output is actually applied, not only shown
* output device removal is handled
* Test output works

## Voice connection

* call connects
* reconnect works
* leaving cleans resources
* duplicate rooms are not created
* duplicate tracks are not published
* duplicate remote audio is not rendered

## Production

* HTTPS expected
* real auth used
* secure token endpoint used
* secrets remain server-side
* RLS/security reviewed
* production build passes
* errors are observable
* mock services cannot accidentally ship
* browser capability fallbacks exist
* two-user test passes

If a capability is browser-dependent, state that clearly and implement the correct fallback rather than pretending it works.

---

# 61. FINAL REPORT

After finishing, report exactly:

## Root causes

List each actual issue discovered.

Example:

```text
1. Input dropdown only changed React state.
2. Selected microphone was never passed to LiveKit.
3. Remote LiveKit audio tracks were never rendered.
4. Safari autoplay failure was not handled.
5. Output selector assumed setSinkId support.
```

Do not invent causes.

## Files changed

List each significant file and why.

## Audio input

Report:

```text
Permission: working / not working
Enumeration: working / not working
Selection: working / not working
Publishing: working / not working
Mute: working / not working
Device switching: working / not working
Device removal: working / not working
```

## Audio output

Report:

```text
Remote playback: working / not working
Autoplay recovery: working / not working
System default: working / not working
Custom output selection: working / unsupported / not working
Device removal: working / not working
```

## Browser compatibility

Report tested behavior for:

```text
Chrome
Edge
Firefox
Safari macOS
Safari iOS
Chrome Android
```

Do not say `tested` unless it was genuinely tested.

Use `not tested` where appropriate.

## Security

Report:

```text
Client secrets exposed: yes/no
Production token endpoint: complete/incomplete
Auth guard: complete/incomplete
RLS review: complete/incomplete
Mock production dependencies: yes/no
```

## Tests

List:

* tests run
* tests passed
* tests failed
* tests that require manual hardware validation

## Remaining blockers

List any remaining requirement that prevents legitimate production deployment.

---

# 62. IMPORTANT EXECUTION RULE

Do not stop after identifying the issue.

Make the repairs.

Do not stop after updating the UI.

Fix the underlying audio implementation.

Do not solve input while leaving output broken.

Do not solve Chrome while making unsupported browser assumptions.

Do not label the application production-ready merely because it works in local development.

Work systematically until the applicable production acceptance gate passes.
