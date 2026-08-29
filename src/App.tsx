import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./features/auth/auth-context";
import { VoiceProvider, useVoice } from "./features/voice/voice-context";
import { SocialProvider } from "./features/social/social-context";
import { CallProvider } from "./features/calls/call-context";
import type { AppView, Theme } from "./types";
import { getRoomById } from "./data/mock";
import { supabase } from "./lib/supabase";

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
import { Spinner, Avatar, PresenceDot, Tooltip } from "./components/ui/primitives";

// ─── Loading shell ─────────────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)]">
      <Spinner size={24} className="text-[var(--text-tertiary)]" />
    </div>
  );
}

// ─── DB setup screen ──────────────────────────────────────────────────────────

const SQL_EDITOR_URL = "https://supabase.com/dashboard/project/qzsxinzoxbaoerjvyzei/sql/new";

function DbSetupScreen({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  function copyAndOpen() {
    navigator.clipboard.writeText(sql.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
    window.open(SQL_EDITOR_URL, "_blank");
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)] p-6">
      <div className="w-full max-w-lg">
        <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-[var(--text-primary)] mb-2">One-time database setup</h2>
        <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
          Click the button below — it copies the SQL and opens your Supabase SQL Editor. Paste and click <strong className="text-[var(--text-primary)]">Run</strong>, then reload this page.
        </p>

        <button
          onClick={copyAndOpen}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity mb-5"
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
              SQL copied — paste in the editor that just opened
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy SQL &amp; Open Supabase Editor
            </>
          )}
        </button>

        <details className="group">
          <summary className="text-[12px] text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)] list-none flex items-center gap-1.5">
            <svg className="group-open:rotate-90 transition-transform" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            View SQL
          </summary>
          <pre className="mt-3 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4 text-[11px] text-[var(--text-secondary)] font-mono overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
            {sql.trim()}
          </pre>
        </details>

        <p className="text-[12px] text-[var(--text-tertiary)] mt-4 text-center">
          After running, reload this page to continue.
        </p>
      </div>
    </div>
  );
}

// ─── User panel ───────────────────────────────────────────────────────────────

function UserPanel({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!profile) return null;

  return (
    <div className="relative shrink-0 px-2 py-2 border-t border-[var(--border-subtle)]">
      <Tooltip label={profile.displayName} side="right">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="relative flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)] transition-colors"
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
              onClick={() => { signOut(); setMenuOpen(false); }}
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
  const [view, setView] = useState<AppView>({ section: "home" });
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("light", effective === "light");
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") e.preventDefault();
      if (
        e.key === "m" && !e.metaKey && !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        const local = voice.localParticipant;
        if (local) voice.setMuted(!local.isMuted);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [voice]);

  function navigate(newView: AppView) {
    setView(newView);
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
    <div className="flex flex-col h-full bg-[var(--background)]">
      <div className="flex flex-1 overflow-hidden">
        {/* Zone A — Community Rail */}
        <div className="flex flex-col w-14 shrink-0 bg-[var(--background)] border-r border-[var(--border-subtle)]">
          <CommunityRail view={view} onNavigate={navigate} inVoiceRoomId={voice.roomId} />
          <div className="flex-1" />
          <UserPanel onNavigate={navigate} />
        </div>

        {/* Zone B — Sidebar */}
        <NavigationSidebar view={view} onNavigate={navigate} connectedRoomId={voice.roomId} />

        {/* Zone C — Main */}
        <main className="flex flex-1 flex-col overflow-hidden bg-[var(--background)]">
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

      <VoiceConnectionStrip voice={voice} />
      <CallOverlay />
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

const SETUP_SQL = `-- Run once in Supabase → SQL Editor

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  bio text, avatar_url text,
  presence text not null default 'online' check (presence in ('online','away','dnd','offline')),
  audio_setup_complete boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles on delete cascade,
  receiver_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled','blocked')),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);
alter table public.friend_requests enable row level security;
create policy "fr_read"   on public.friend_requests for select to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy "fr_insert" on public.friend_requests for insert to authenticated with check (auth.uid() = sender_id);
create policy "fr_update" on public.friend_requests for update to authenticated using (auth.uid() in (sender_id, receiver_id));
create policy "fr_delete" on public.friend_requests for delete to authenticated using (auth.uid() in (sender_id, receiver_id));

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.direct_conversations enable row level security;
create policy "conv_insert" on public.direct_conversations for insert to authenticated with check (true);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.direct_conversations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;
create policy "cm_read" on public.conversation_members for select to authenticated
  using (conversation_id in (
    select conversation_id from public.conversation_members where user_id = auth.uid()
  ));
create policy "cm_insert" on public.conversation_members for insert to authenticated with check (true);

-- conv_read must come after conversation_members exists (policy references the table)
create policy "conv_read" on public.direct_conversations for select to authenticated
  using (exists (select 1 from public.conversation_members where conversation_id = id and user_id = auth.uid()));

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
alter table public.direct_messages enable row level security;
create policy "dm_read" on public.direct_messages for select to authenticated
  using (exists (select 1 from public.conversation_members
    where conversation_id = direct_messages.conversation_id and user_id = auth.uid()));
create policy "dm_insert" on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id and exists (
    select 1 from public.conversation_members
    where conversation_id = direct_messages.conversation_id and user_id = auth.uid()));
create policy "dm_update" on public.direct_messages for update to authenticated using (auth.uid() = sender_id);
create policy "dm_delete" on public.direct_messages for delete to authenticated using (auth.uid() = sender_id);

alter publication supabase_realtime add table public.direct_messages;`;

function AppInner() {
  const { status } = useAuth();
  const [dbReady, setDbReady] = useState<boolean | null>(null);

  useEffect(() => {
    function isMissing(err: unknown): boolean {
      const e = err as { message?: string; code?: string } | null;
      if (!e) return false;
      return (
        e.message?.includes("does not exist") ||
        e.message?.includes("Could not find the table") ||
        e.message?.includes("schema cache") ||
        e.code === "42P01" ||
        e.code === "PGRST106" ||
        e.code === "PGRST200" ||
        false
      );
    }

    async function setup() {
      // Check for the last table in the migration chain.
      // If it exists, all earlier tables (profiles, friend_requests, etc.) exist too.
      const checks = await Promise.all([
        supabase.from("profiles").select("id").limit(1),
        supabase.from("conversation_members").select("conversation_id").limit(1),
        supabase.from("direct_messages").select("id").limit(1),
      ]);
      const anyMissing = checks.some(({ error }) => isMissing(error));
      setDbReady(!anyMissing);
    }
    setup();
  }, []);

  if (status === "loading" || dbReady === null) return <LoadingShell />;
  if (dbReady === false) return <DbSetupScreen sql={SETUP_SQL} />;
  if (status === "unauthenticated") return <AuthPage />;

  return (
    <SocialProvider>
      <VoiceProvider>
        <CallProvider>
          <AppContent />
        </CallProvider>
      </VoiceProvider>
    </SocialProvider>
  );
}
