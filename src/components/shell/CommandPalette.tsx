import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Headphones, Home, MessageCircle, Search, Settings, Users } from "lucide-react";
import type { AppView } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { useSocial } from "../../features/social/social-context";
import { useVoice } from "../../features/voice/voice-context";

export function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (view: AppView) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { communities, rooms } = useCommunities();
  const { friends, getOrCreateConversation } = useSocial();
  const voice = useVoice();

  const commands = useMemo(() => {
    const base = [
      { id: "home", label: "Go to Home", detail: "Navigation", icon: Home, run: () => onNavigate({ section: "home" }) },
      { id: "friends", label: "Open Friends", detail: "Navigation", icon: Users, run: () => onNavigate({ section: "friends" }) },
      { id: "settings", label: "Open Voice & Audio", detail: "Settings", icon: Settings, run: () => onNavigate({ section: "settings", settingsPage: "voice-audio" }) },
      ...(voice.localParticipant ? [{ id: "mute", label: voice.localParticipant.isMuted ? "Unmute microphone" : "Mute microphone", detail: "Voice", icon: Headphones, run: () => void voice.setMuted(!voice.localParticipant!.isMuted) }] : []),
    ];
    const communityCommands = communities.map(c => ({ id: `c-${c.id}`, label: c.name, detail: "Community", icon: Hash, run: () => onNavigate({ section: "community" as const, communityId: c.id }) }));
    const roomCommands = rooms.map(r => ({ id: `r-${r.id}`, label: `${r.kind === "text" ? "#" : "Join"} ${r.name}`, detail: r.kind === "text" ? "Text channel" : "Voice room", icon: r.kind === "text" ? MessageCircle : Headphones, run: () => onNavigate({ section: "community" as const, communityId: r.communityId, roomId: r.id }) }));
    const friendCommands = friends.filter(f => f.relation === "friends").map(f => ({ id: `f-${f.profile.id}`, label: `Message ${f.profile.displayName}`, detail: `@${f.profile.username}`, icon: MessageCircle, run: async () => { const id = await getOrCreateConversation(f.profile.id); onNavigate({ section: "direct", conversationId: id, friendId: f.profile.id, friendDisplayName: f.profile.displayName }); } }));
    return [...base, ...communityCommands, ...roomCommands, ...friendCommands];
  }, [communities, rooms, friends, getOrCreateConversation, onNavigate, voice]);
  const filtered = commands.filter(c => `${c.label} ${c.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);

  useEffect(() => { if (open) { setQuery(""); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  useEffect(() => { setActive(0); }, [query]);
  if (!open) return null;

  function run(index: number) { const command = filtered[index]; if (!command) return; void command.run(); onClose(); }
  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 px-2 pt-2 backdrop-blur-[2px] sm:px-3 sm:pt-[12vh]" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="qp-raised qp-panel-enter w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 sm:gap-3 sm:px-4"><Search size={17} className="shrink-0 text-[var(--text-tertiary)]" /><input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "ArrowDown") { e.preventDefault(); setActive(v => Math.min(v + 1, filtered.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); } if (e.key === "Enter") run(active); }} placeholder="Search people, rooms, and actions…" className="h-14 min-w-0 flex-1 bg-transparent text-[14px] outline-none" aria-activedescendant={filtered[active]?.id} /><kbd className="hidden rounded border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] sm:block">ESC</kbd></div>
      <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto p-2 sm:max-h-[55vh]" role="listbox">{filtered.length ? filtered.map((command, index) => { const Icon = command.icon; return <button id={command.id} key={command.id} role="option" aria-selected={active === index} onMouseEnter={() => setActive(index)} onClick={() => run(index)} className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left ${active === index ? "bg-[var(--surface-3)]" : "hover:bg-[var(--surface-2)]"}`}><Icon size={16} className="shrink-0 text-[var(--text-tertiary)]" /><span className="min-w-0 flex-1 truncate text-[13px] font-medium">{command.label}</span><span className="hidden text-[11px] text-[var(--text-tertiary)] sm:inline">{command.detail}</span></button>; }) : <p className="px-3 py-8 text-center text-[13px] text-[var(--text-tertiary)]">No matching commands</p>}</div>
    </div>
  </div>;
}
