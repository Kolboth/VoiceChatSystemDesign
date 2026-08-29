import { useState } from "react";
import {
  Grid2X2,
  Hand,
  Headphones,
  LayoutGrid,
  List,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Settings2,
  UserPlus,
  Users,
  VolumeX,
} from "lucide-react";
import type { Room, VoiceParticipant, VoiceRoomController } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { InviteFriendsDialog } from "../communities/CommunityDialogs";
import { Button, EmptyState, ReconnectBanner, Tooltip, Menu, Popover } from "../ui/primitives";
import { ParticipantTile, ParticipantCompactRow } from "./ParticipantTile";
import { AudioDevicePanel } from "./AudioDevicePanel";
import { MemberInspector } from "./MemberInspector";

type Layout = "grid" | "focus" | "compact";

interface VoiceRoomProps {
  room: Room;
  voice: VoiceRoomController;
}

const LAYOUT_ICONS: Record<Layout, typeof LayoutGrid> = {
  grid: LayoutGrid,
  focus: Grid2X2,
  compact: List,
};

function VoiceControlBar({ voice }: { voice: VoiceRoomController }) {
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);
  const local = voice.localParticipant;
  const isMuted = local?.isMuted ?? false;
  const isDeafened = local?.isDeafened ?? false;
  const hasHand = local?.hasRaisedHand ?? false;

  function openDevices(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorPos({ top: Math.max(12, rect.top - 348), left: Math.max(12, rect.left - 140) });
    setDevicePanelOpen(true);
  }

  return (
    <>
      <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-1.5">
          <Tooltip label={isMuted ? "Unmute (M)" : "Mute (M)"} side="top">
            <button
              aria-label={isMuted ? "Unmute" : "Mute microphone"}
              aria-pressed={isMuted}
              onClick={() => voice.setMuted(!isMuted)}
              className={`qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border ${
                isMuted
                  ? "border-[var(--danger)]/22 bg-[var(--danger)]/12 text-[var(--danger)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </Tooltip>

          <Tooltip label={isDeafened ? "Undeafen" : "Deafen"} side="top">
            <button
              aria-label={isDeafened ? "Undeafen" : "Deafen audio output"}
              aria-pressed={isDeafened}
              onClick={() => voice.setDeafened(!isDeafened)}
              className={`qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border ${
                isDeafened
                  ? "border-[var(--danger)]/22 bg-[var(--danger)]/12 text-[var(--danger)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isDeafened ? <VolumeX size={16} /> : <Headphones size={16} />}
            </button>
          </Tooltip>

          <Tooltip label="Audio devices" side="top">
            <button
              aria-label="Audio devices"
              onClick={openDevices}
              className="qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            >
              <Settings2 size={16} />
            </button>
          </Tooltip>

          <Tooltip label={hasHand ? "Lower hand" : "Raise hand"} side="top">
            <button
              aria-label={hasHand ? "Lower hand" : "Raise hand"}
              aria-pressed={hasHand}
              onClick={() => voice.raiseHand(!hasHand)}
              className={`qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border ${
                hasHand
                  ? "border-[var(--warning)]/24 bg-[var(--warning)]/10 text-[var(--warning)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Hand size={16} />
            </button>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />

          <Tooltip label="Leave room" side="top">
            <button
              aria-label="Leave voice room"
              onClick={() => voice.leaveRoom()}
              className="qp-interactive flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--danger)]/18 bg-[var(--danger)]/[0.07] px-3 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger)]/12"
            >
              <PhoneOff size={15} />
              Leave
            </button>
          </Tooltip>
        </div>
      </div>

      {devicePanelOpen && anchorPos && (
        <AudioDevicePanel voice={voice} anchor={anchorPos} onClose={() => setDevicePanelOpen(false)} />
      )}
    </>
  );
}

export function VoiceRoom({ room, voice }: VoiceRoomProps) {
  const [layout, setLayout] = useState<Layout>("grid");
  const [contextMenu, setContextMenu] = useState<{ participant: VoiceParticipant; pos: { top: number; left: number } } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inspectedParticipant, setInspectedParticipant] = useState<VoiceParticipant | null>(null);
  const { getCommunityById } = useCommunities();

  const community = getCommunityById(room.communityId);
  const { participants, state } = voice;
  const isConnected = voice.sessionKind === "community" && voice.roomId === room.id && (state === "connected" || state === "reconnecting");
  const participantCount = isConnected ? participants.length : 0;
  const useCompact = participantCount > 12;
  const speakingCount = participants.filter(p => p.isSpeaking && !p.isMuted && !p.isServerMuted).length;

  function handleContextMenu(participant: VoiceParticipant, e: React.MouseEvent) {
    setContextMenu({ participant, pos: { top: e.clientY, left: e.clientX } });
  }

  return (
    <div className="relative flex h-full flex-col qp-page-enter">
      {state === "reconnecting" && <ReconnectBanner />}

      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--background)]/95 px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--text-secondary)]">
                <Mic size={14} />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{room.name}</h1>
                  {isConnected && (
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--live)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--live)]" /> Live
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">
                  {community?.name ?? "Community"}{room.topic ? ` · ${room.topic}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isConnected && (
              <div className="hidden items-center gap-2 text-[11px] text-[var(--text-tertiary)] sm:flex">
                <button onClick={() => setInspectedParticipant(participants[0] ?? null)} className="flex items-center gap-1 hover:text-[var(--text-primary)]" aria-label="Open member inspector"><Users size={12} /> {participantCount}</button>
                {speakingCount > 0 && <span className="text-[var(--live)]">{speakingCount} speaking</span>}
              </div>
            )}

            {isConnected && participantCount > 0 && (
              <div className="qp-toolbar flex items-center gap-0.5 rounded-[var(--radius-md)] p-0.5">
                {(["grid", "focus", "compact"] as Layout[]).map(mode => {
                  const Icon = LAYOUT_ICONS[mode];
                  return (
                    <Tooltip key={mode} label={`${mode[0].toUpperCase()}${mode.slice(1)} layout`} side="bottom">
                      <button
                        aria-label={`${mode} layout`}
                        aria-pressed={layout === mode}
                        onClick={() => setLayout(mode)}
                        className={`qp-interactive flex h-7 w-7 items-center justify-center rounded-[5px] ${layout === mode ? "bg-[var(--surface-4)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                      >
                        <Icon size={13} />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            )}

            <Button onClick={() => setInviteOpen(true)} variant="outline" size="sm" leadingIcon={<UserPlus size={14} />}>
              Invite
            </Button>

            <Tooltip label="Room options" side="bottom">
              <button className="qp-interactive flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]" aria-label="Room options">
                <MoreHorizontal size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {voice.roomId === room.id && voice.error && (
        <div className="mx-5 mt-3 rounded-[var(--radius-md)] border border-[var(--danger)]/18 bg-[var(--danger)]/[0.06] px-3 py-2 text-[12px] text-[var(--danger)]">
          {voice.error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {!isConnected ? (
          <div className="qp-voice-stage mx-auto flex min-h-[360px] max-w-2xl items-center justify-center rounded-[var(--radius-xl)] px-6 py-12">
            <EmptyState
              title={room.name}
              description={room.topic ?? "Join the room to hear and talk with everyone here."}
              icon={<Mic size={28} />}
              action={
                <Button variant="primary" size="md" onClick={() => voice.joinRoom(room.id, room.communityId)} loading={state === "connecting"}>
                  Join voice
                </Button>
              }
            />
          </div>
        ) : participants.length === 0 ? (
          <div className="qp-voice-stage mx-auto flex min-h-[360px] max-w-2xl items-center justify-center rounded-[var(--radius-xl)] px-6 py-12">
            <EmptyState
              title="You're the first one here"
              description="Invite a friend and keep this room open while you wait."
              icon={<Users size={27} />}
              action={<Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>Invite people</Button>}
            />
          </div>
        ) : layout === "compact" || useCompact ? (
          <div className="mx-auto max-w-2xl space-y-0.5">
            {participants.map(p => <ParticipantCompactRow key={p.userId} participant={p} onContextMenu={handleContextMenu} />)}
          </div>
        ) : layout === "focus" ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {(() => {
              const speaker = participants.find(p => p.isSpeaking && !p.isMuted) ?? participants[0];
              const rest = participants.filter(p => p.userId !== speaker.userId);
              return (
                <>
                  <div className="mx-auto w-full max-w-md">
                    <ParticipantTile participant={speaker} onContextMenu={handleContextMenu} />
                  </div>
                  {rest.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {rest.map(p => <ParticipantTile key={p.userId} participant={p} onContextMenu={handleContextMenu} />)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className={`mx-auto grid gap-2.5 ${
            participants.length <= 2 ? "max-w-2xl grid-cols-1 sm:grid-cols-2" :
            participants.length <= 4 ? "max-w-3xl grid-cols-1 sm:grid-cols-2" :
            participants.length <= 6 ? "max-w-4xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
            participants.length <= 9 ? "max-w-5xl grid-cols-2 lg:grid-cols-3" :
            "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}>
            {participants.map(p => <ParticipantTile key={p.userId} participant={p} onContextMenu={handleContextMenu} />)}
          </div>
        )}
      </div>

      {isConnected && <VoiceControlBar voice={voice} />}

      <InviteFriendsDialog open={inviteOpen} room={room} onClose={() => setInviteOpen(false)} />

      {contextMenu && (
        <Popover open onClose={() => setContextMenu(null)} anchor={contextMenu.pos}>
          <Menu
            items={[
              { id: "profile", label: "View profile" },
              { id: "message", label: "Message" },
              { id: "volume", label: "Adjust local volume" },
              { id: "sep1", label: "", separator: true },
              { id: "mute-server", label: "Server mute" },
              { id: "move", label: "Move to room" },
              { id: "sep2", label: "", separator: true },
              { id: "kick", label: "Kick from room", destructive: true },
              { id: "ban", label: "Ban", destructive: true },
            ]}
            onSelect={id => { if (id === "profile" || id === "volume") setInspectedParticipant(contextMenu.participant); setContextMenu(null); }}
          />
        </Popover>
      )}
      {inspectedParticipant && <MemberInspector participant={inspectedParticipant} onClose={() => setInspectedParticipant(null)} />}
    </div>
  );
}
