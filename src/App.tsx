import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { AuthProvider, useAuth } from "./features/auth/auth-context";
import { VoiceProvider, useVoice } from "./features/voice/voice-context";
import { SocialProvider } from "./features/social/social-context";
import { CommunityProvider, useCommunities } from "./features/communities/community-context";
import { CallProvider, useCall } from "./features/calls/call-context";
import type { AppView, Theme } from "./types";

import { AuthPage } from "./pages/AuthPage";
import { AudioSetupPage } from "./pages/AudioSetupPage";
import { HomePage } from "./pages/HomePage";
import { TextRoomPage } from "./pages/TextRoomPage";

import { CommunityRail } from "./components/shell/CommunityRail";
import { NavigationSidebar } from "./components/shell/NavigationSidebar";
import { VoiceRoom } from "./components/voice/VoiceRoom";
import { VoiceConnectionStrip } from "./components/voice/VoiceConnectionStrip";
import { FriendsView } from "./components/friends/FriendsView";
import { DirectConversation } from "./components/messages/DirectConversation";
import { Settings } from "./components/settings/Settings";
import { CallOverlay } from "./components/calls/CallOverlay";
import { CommandPalette } from "./components/shell/CommandPalette";
import { Spinner, Avatar, PresenceDot, Tooltip } from "./components/ui/primitives";

// ─── Loading shell ─────────────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)]">
      <Spinner size={24} className="text-[var(--text-tertiary)]" />
    </div>
  );
}

// ─── User panel ───────────────────────────────────────────────────────────────

function UserPanel({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { profile, signOut } = useAuth();
  const { activeCall, endCall } = useCall();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!profile) return null;

  return (
    <div className="relative shrink-0 border-t border-[var(--border-subtle)] px-2 py-2">
      <Tooltip label={profile.displayName} side="right">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="qp-interactive relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-2)]"
          aria-label="User menu"
        >
          <Avatar displayName={profile.displayName} userId={profile.id} size="sm" />
          <div className="absolute -bottom-0.5 -right-0.5">
            <PresenceDot presence={profile.presence} size={9} />
          </div>
        </button>
      </Tooltip>
      {menuOpen && (
        <div className="absolute bottom-full left-2 mb-1 w-48 bg-[var(--surface-3)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-xl py-1 z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{profile.displayName}</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">@{profile.username}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { onNavigate({ section: "settings", settingsPage: "account" }); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Settings
            </button>
            <div className="h-px bg-[var(--border-subtle)] my-1" />
            <button
              onClick={async () => {
                if (activeCall) await endCall();
                await signOut();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main app content ─────────────────────────────────────────────────────────

function AppContent() {
  const { profile, status } = useAuth();
  const voice = useVoice();
  const { getRoomById } = useCommunities();
  const [view, setView] = useState<AppView>({ section: "home" });
  const [theme, setTheme] = useState<Theme>("dark");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("light", effective === "light");
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(v => !v); }
      if (e.key === "Escape") { setPaletteOpen(false); setMobileNavOpen(false); }
      if (
        e.key === "m" && !e.metaKey && !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        const local = voice.localParticipant;
        if (local) voice.setMuted(!local.isMuted);
      }
      if (e.key === "d" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        const local = voice.localParticipant;
        if (local) voice.setDeafened(!local.isDeafened);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [voice]);

  function navigate(newView: AppView) {
    setView(newView);
    setMobileNavOpen(false);
    if (newView.roomId) {
      const room = getRoomById(newView.roomId);
      if (room?.kind === "voice" && voice.state === "idle") {
        voice.joinRoom(newView.roomId, newView.communityId);
      }
    }
  }

  if (status === "loading") return <LoadingShell />;
  if (status === "unauthenticated") return <AuthPage />;
  if (!profile) return <LoadingShell />;
  if (!profile.audioSetupComplete) return <AudioSetupPage />;

  const currentRoom = view.roomId ? getRoomById(view.roomId) : undefined;

  return (
    <div className="qp-terminal-canvas flex h-full flex-col">
      <header className="qp-mobile-bar hidden h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-0)] px-3">
        <button onClick={() => setMobileNavOpen(true)} className="qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]" aria-label="Open navigation"><Menu size={18} /></button>
        <span className="qp-display flex items-center gap-2 text-[13px]"><img src="/beo-beo-vc-icon.png" alt="" className="h-6 w-6 rounded-md object-cover" />Beo Beo VC</span>
        <button onClick={() => setPaletteOpen(true)} className="qp-interactive flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]" aria-label="Search and commands"><Search size={17} /></button>
      </header>
      <div className="flex flex-1 overflow-hidden bg-[var(--background)]">
        {/* Zone A — Community Rail */}
        <div className="qp-desktop-rail flex w-14 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-0)]">
          <CommunityRail view={view} onNavigate={navigate} inVoiceRoomId={voice.roomId} />
          <UserPanel onNavigate={navigate} />
        </div>

        {/* Zone B — Sidebar */}
        <div className="qp-desktop-sidebar contents"><NavigationSidebar view={view} onNavigate={navigate} connectedRoomId={voice.roomId} /></div>

        {/* Zone C — Main */}
        <main className="qp-workspace flex flex-1 flex-col overflow-hidden">
          {view.section === "home" && <HomePage onNavigate={navigate} />}

          {view.section === "friends" && !view.conversationId && (
            <FriendsView
              onOpenConversation={(convId, friendId, friendDisplayName) =>
                navigate({ section: "direct", conversationId: convId, friendId, friendDisplayName })
              }
            />
          )}

          {(view.section === "direct" || (view.section === "friends" && view.conversationId)) && view.conversationId && (
            <DirectConversation
              key={view.conversationId}
              conversationId={view.conversationId}
              friendId={view.friendId ?? ""}
              friendDisplayName={view.friendDisplayName}
            />
          )}

          {view.section === "community" && view.roomId && currentRoom?.kind === "voice" && (
            <VoiceRoom room={currentRoom} voice={voice} />
          )}

          {view.section === "community" && view.roomId && currentRoom?.kind === "text" && (
            <TextRoomPage room={currentRoom} />
          )}

          {view.section === "community" && !view.roomId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-[15px] font-medium text-[var(--text-primary)]">Select a room</p>
              <p className="text-[13px] text-[var(--text-secondary)]">Choose a voice or text room from the sidebar.</p>
            </div>
          )}

          {view.section === "settings" && (
            <Settings page={view.settingsPage ?? "account"} theme={theme} onThemeChange={setTheme} />
          )}
        </main>
      </div>

      {mobileNavOpen && <div className="fixed inset-0 z-[90] flex bg-black/55" role="dialog" aria-modal="true" aria-label="Navigation"><div className="qp-mobile-drawer flex w-[min(92vw,340px)] qp-panel-enter bg-[var(--surface-0)]"><div className="flex w-14 shrink-0 flex-col border-r border-[var(--border-subtle)]"><CommunityRail view={view} onNavigate={navigate} inVoiceRoomId={voice.roomId} /><UserPanel onNavigate={navigate} /></div><NavigationSidebar view={view} onNavigate={navigate} connectedRoomId={voice.roomId} /></div><button onClick={() => setMobileNavOpen(false)} className="m-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-3)]" aria-label="Close navigation"><X size={17} /></button></div>}

      <VoiceConnectionStrip voice={voice} />
      <CallOverlay />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { status } = useAuth();

  if (status === "loading") return <LoadingShell />;
  if (status === "unauthenticated") return <AuthPage />;

  return (
    <SocialProvider>
      <CommunityProvider>
        <VoiceProvider>
          <CallProvider>
            <AppContent />
          </CallProvider>
        </VoiceProvider>
      </CommunityProvider>
    </SocialProvider>
  );
}
