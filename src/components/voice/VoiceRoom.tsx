import { useState } from "react";
import type { Room, VoiceParticipant, VoiceRoomController } from "../../types";
import { getCommunityById } from "../../data/mock";
import { Button, EmptyState, ReconnectBanner, Tooltip, Menu, Popover } from "../ui/primitives";
import { ParticipantTile, ParticipantCompactRow } from "./ParticipantTile";

type Layout = "grid" | "focus" | "compact";

interface VoiceRoomProps {
  room: Room;
  voice: VoiceRoomController;
}

function VoiceControlBar({ voice }: { voice: VoiceRoomController }) {
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);
  const local = voice.localParticipant;
  const isMuted = local?.isMuted ?? false;
  const isDeafened = local?.isDeafened ?? false;
  const hasHand = local?.hasRaisedHand ?? false;

  return (
    <div className="flex items-center justify-center gap-2 px-6 py-3 border-t border-[var(--border-subtle)]">
      <Tooltip label={isMuted ? "Unmute (M)" : "Mute (M)"} side="top">
        <button
          aria-label={isMuted ? "Unmute" : "Mute microphone"}
          aria-pressed={isMuted}
          onClick={() => voice.setMuted(!isMuted)}
          className={`flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] transition-colors font-medium text-sm gap-1.5
            ${isMuted
              ? "bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25 ring-1 ring-[var(--danger)]/30"
              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            }`}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
      </Tooltip>

      <Tooltip label={isDeafened ? "Undeafen" : "Deafen"} side="top">
        <button
          aria-label={isDeafened ? "Undeafen" : "Deafen audio output"}
          aria-pressed={isDeafened}
          onClick={() => voice.setDeafened(!isDeafened)}
          className={`flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] transition-colors
            ${isDeafened
              ? "bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25 ring-1 ring-[var(--danger)]/30"
              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {isDeafened
              ? <><path d="M11 5h2a2 2 0 0 1 0 4h-3"/><path d="M5 14H4a9 9 0 0 0 16 0h-1"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></>
            }
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={hasHand ? "Lower hand" : "Raise hand"} side="top">
        <button
          aria-label={hasHand ? "Lower hand" : "Raise hand"}
          aria-pressed={hasHand}
          onClick={() => voice.raiseHand(!hasHand)}
          className={`flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] transition-colors
            ${hasHand
              ? "bg-[var(--warning)]/15 text-[var(--warning)]"
              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[var(--border-subtle)] mx-1" />

      <Tooltip label="Leave room" side="top">
        <button
          aria-label="Leave voice room"
          onClick={() => voice.leaveRoom()}
          className="flex items-center justify-center px-4 h-10 rounded-[var(--radius-md)] bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors text-sm font-medium gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Leave
        </button>
      </Tooltip>
    </div>
  );
}

export function VoiceRoom({ room, voice }: VoiceRoomProps) {
  const [layout, setLayout] = useState<Layout>("grid");
  const [contextMenu, setContextMenu] = useState<{ participant: VoiceParticipant; pos: { top: number; left: number } } | null>(null);

  const community = getCommunityById(room.communityId);
  const { participants, state } = voice;
  const isConnected = voice.roomId === room.id;

  function handleContextMenu(participant: VoiceParticipant, e: React.MouseEvent) {
    setContextMenu({ participant, pos: { top: e.clientY, left: e.clientX } });
  }

  const participantCount = isConnected ? participants.length : 0;
  const useCompact = participantCount > 12;

  return (
    <div className="flex flex-col h-full">
      {/* Reconnect banner */}
      {state === "reconnecting" && <ReconnectBanner />}

      {/* Room header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <h1 className="text-[17px] font-semibold text-[var(--text-primary)]">{room.name}</h1>
            {isConnected && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--live)]/15 text-[var(--live)]">Connected</span>}
          </div>
          {room.topic && <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 ml-6">{room.topic}</p>}
          {community && <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 ml-6">{community.name}</p>}
        </div>

        <div className="flex items-center gap-2">
          {participantCount > 0 && (
            <span className="text-[13px] text-[var(--text-secondary)] tabular-nums">{participantCount} participant{participantCount !== 1 ? "s" : ""}</span>
          )}

          {/* Layout toggle */}
          {isConnected && participantCount > 0 && (
            <div className="flex items-center gap-0.5 bg-[var(--surface-2)] rounded-[var(--radius-sm)] p-0.5">
              {(["grid", "focus", "compact"] as Layout[]).map(l => (
                <button
                  key={l}
                  aria-label={`${l} layout`}
                  aria-pressed={layout === l}
                  onClick={() => setLayout(l)}
                  className={`px-2 py-1 text-[11px] rounded-[3px] transition-colors capitalize ${layout === l ? "bg-[var(--surface-3)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" leadingIcon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          }>
            Invite
          </Button>
        </div>
      </div>

      {/* Main voice canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        {!isConnected ? (
          <EmptyState
            title={room.name}
            description={room.topic ?? "Join the room to see who's in voice."}
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            }
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => voice.joinRoom(room.id, room.communityId)}
                loading={state === "connecting"}
              >
                Join room
              </Button>
            }
          />
        ) : participants.length === 0 ? (
          <EmptyState
            title="No one else is here"
            description="Invite someone to join you in this room."
            action={<Button variant="outline" size="sm">Invite people</Button>}
          />
        ) : layout === "compact" || useCompact ? (
          <div className="max-w-xl mx-auto">
            {participants.map(p => (
              <ParticipantCompactRow key={p.userId} participant={p} onContextMenu={handleContextMenu} />
            ))}
          </div>
        ) : layout === "focus" ? (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {/* Active speaker prominent */}
            {(() => {
              const speaker = participants.find(p => p.isSpeaking) ?? participants[0];
              const rest = participants.filter(p => p.userId !== speaker.userId);
              return (
                <>
                  <div className="max-w-xs mx-auto w-full">
                    <ParticipantTile participant={speaker} onContextMenu={handleContextMenu} />
                  </div>
                  {rest.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {rest.map(p => <ParticipantTile key={p.userId} participant={p} onContextMenu={handleContextMenu} />)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          // Grid layout
          <div className={`grid gap-3 ${
            participants.length <= 2 ? "grid-cols-2 max-w-lg mx-auto" :
            participants.length <= 4 ? "grid-cols-2 max-w-xl mx-auto" :
            participants.length <= 6 ? "grid-cols-3 max-w-2xl mx-auto" :
            participants.length <= 9 ? "grid-cols-3" :
            "grid-cols-4"
          }`}>
            {participants.map(p => (
              <ParticipantTile key={p.userId} participant={p} onContextMenu={handleContextMenu} />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      {isConnected && <VoiceControlBar voice={voice} />}

      {/* Context menu */}
      {contextMenu && (
        <Popover
          open
          onClose={() => setContextMenu(null)}
          anchor={contextMenu.pos}
        >
          <Menu
            items={[
              { id: "profile", label: "View profile", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg> },
              { id: "message", label: "Message", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { id: "volume", label: "Adjust local volume", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> },
              { id: "sep1", label: "", separator: true },
              { id: "mute-server", label: "Server mute", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/></svg> },
              { id: "move", label: "Move to room", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg> },
              { id: "sep2", label: "", separator: true },
              { id: "kick", label: "Kick from room", destructive: true },
              { id: "ban", label: "Ban", destructive: true },
            ]}
            onSelect={id => {
              setContextMenu(null);
            }}
          />
        </Popover>
      )}
    </div>
  );
}
