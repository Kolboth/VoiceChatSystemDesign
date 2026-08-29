import type { Community, NavSection, AppView } from "../../types";
import { Tooltip } from "../ui/primitives";
import { MOCK_COMMUNITIES } from "../../data/mock";

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
      <div className="relative">
        <button
          onClick={onClick}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`relative flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] transition-all duration-100 font-semibold text-sm cursor-pointer select-none
            ${active
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            }`}
        >
          {children}
          {hasVoice && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--live)] ring-2 ring-[var(--background)]" aria-label="In voice" />
          )}
        </button>
        {unread && !active && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent)]" aria-label="Unread" />
        )}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-1 h-5 rounded-r-full bg-[var(--accent)]" />
        )}
      </div>
    </Tooltip>
  );
}

export function CommunityRail({ view, onNavigate, inVoiceRoomId }: CommunityRailProps) {
  return (
    <nav className="flex flex-col items-center gap-1.5 w-14 py-3 bg-[var(--background)] border-r border-[var(--border-subtle)] shrink-0" aria-label="Communities">
      {/* Home */}
      <RailItem label="Home" active={view.section === "home"} onClick={() => onNavigate({ section: "home" })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </RailItem>

      {/* Friends / Direct */}
      <RailItem label="Friends & Direct" active={view.section === "friends" || view.section === "direct"} onClick={() => onNavigate({ section: "friends" })} unread>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </RailItem>

      <div className="w-6 h-px bg-[var(--border-subtle)] my-1" />

      {/* Community icons */}
      {MOCK_COMMUNITIES.map(community => (
        <RailItem
          key={community.id}
          label={community.name}
          active={view.section === "community" && view.communityId === community.id}
          onClick={() => onNavigate({ section: "community", communityId: community.id })}
          hasVoice={inVoiceRoomId !== undefined && view.communityId === community.id}
        >
          <span className="text-sm font-bold" style={{ color: community.iconColor }}>
            {community.iconInitials}
          </span>
        </RailItem>
      ))}

      {/* Add community */}
      <Tooltip label="Add community" side="right">
        <button
          aria-label="Add community"
          className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </Tooltip>

      <div className="flex-1" />

      {/* Settings */}
      <RailItem label="Settings" active={view.section === "settings"} onClick={() => onNavigate({ section: "settings", settingsPage: "account" })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </RailItem>
    </nav>
  );
}
