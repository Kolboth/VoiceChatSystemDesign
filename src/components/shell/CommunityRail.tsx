import { useState } from "react";
import { Home, Plus, Settings, UsersRound } from "lucide-react";
import type { AppView } from "../../types";
import { Tooltip } from "../ui/primitives";
import { useCommunities } from "../../features/communities/community-context";
import { CreateCommunityDialog } from "../communities/CommunityDialogs";

interface CommunityRailProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  inVoiceRoomId?: string;
}

function RailItem({ label, active, onClick, children, hasVoice, unread }: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hasVoice?: boolean;
  unread?: boolean;
}) {
  return (
    <Tooltip label={label} side="right">
      <div className="relative flex w-full justify-center">
        <button
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`qp-interactive relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border text-[var(--text-secondary)] ${
            active
              ? "border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text-primary)]"
              : "border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          }`}
        >
          {children}
          {hasVoice && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--live)] ring-2 ring-[var(--surface-0)]" aria-label="In voice" />}
        </button>
        {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]" aria-hidden="true" />}
        {unread && !active && <span className="absolute right-1 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-label="Unread" />}
      </div>
    </Tooltip>
  );
}

export function CommunityRail({ view, onNavigate, inVoiceRoomId }: CommunityRailProps) {
  const { communities, getRoomById } = useCommunities();
  const [createOpen, setCreateOpen] = useState(false);
  const voiceCommunityId = inVoiceRoomId ? getRoomById(inVoiceRoomId)?.communityId : undefined;

  return (
    <>
      <nav className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 py-2.5" aria-label="Communities">
        <img src="/beo-beo-vc-icon.png" alt="Beo Beo VC" className="mb-1 h-8 w-8 rounded-[var(--radius-md)] object-cover shadow-[0_0_16px_var(--terminal-glow)]" />

        <RailItem label="Home" active={view.section === "home"} onClick={() => onNavigate({ section: "home" })}>
          <Home size={16} strokeWidth={1.9} />
        </RailItem>

        <RailItem label="Friends & Direct" active={view.section === "friends" || view.section === "direct"} onClick={() => onNavigate({ section: "friends" })}>
          <UsersRound size={16} strokeWidth={1.9} />
        </RailItem>

        <div className="my-1.5 h-px w-5 bg-[var(--border-subtle)]" />

        <div className="flex w-full flex-col items-center gap-1 overflow-y-auto px-1 pb-1">
          {communities.map(community => (
            <RailItem
              key={community.id}
              label={community.name}
              active={view.section === "community" && view.communityId === community.id}
              onClick={() => onNavigate({ section: "community", communityId: community.id })}
              hasVoice={voiceCommunityId === community.id}
            >
              <span className="text-[11px] font-bold" style={{ color: community.iconColor }}>{community.iconInitials}</span>
            </RailItem>
          ))}

          <Tooltip label="Create community" side="right">
            <button
              aria-label="Create community"
              onClick={() => setCreateOpen(true)}
              className="qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] hover:border-[var(--accent)]/55 hover:bg-[var(--accent)]/[0.045] hover:text-[var(--accent-text)]"
            >
              <Plus size={15} />
            </button>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <RailItem label="Settings" active={view.section === "settings"} onClick={() => onNavigate({ section: "settings", settingsPage: "account" })}>
          <Settings size={16} strokeWidth={1.9} />
        </RailItem>
      </nav>

      <CreateCommunityDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={communityId => onNavigate({ section: "community", communityId })} />
    </>
  );
}
