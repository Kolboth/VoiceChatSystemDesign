import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Send } from "lucide-react";
import type { Room, RoomMessage, UserProfile } from "../types";
import { supabase } from "../lib/supabase";
import { useAuth } from "../features/auth/auth-context";
import { Avatar, Button, EmptyState, Spinner } from "../components/ui/primitives";

type MessageRow = { id: string; room_id: string; sender_id: string; body: string; created_at: string; edited_at?: string | null; sender?: { id: string; username: string; display_name: string; avatar_url?: string | null; presence?: string | null } | null };
const SELECT = "id, room_id, sender_id, body, created_at, edited_at, sender:profiles!room_messages_sender_id_fkey(id, username, display_name, avatar_url, presence)";

function mapMessage(row: MessageRow): RoomMessage {
  const sender: UserProfile | undefined = row.sender ? { id: row.sender.id, username: row.sender.username, displayName: row.sender.display_name, avatarUrl: row.sender.avatar_url ?? undefined, presence: (row.sender.presence as UserProfile["presence"]) ?? "offline", audioSetupComplete: true, createdAt: "" } : undefined;
  return { id: row.id, roomId: row.room_id, senderId: row.sender_id, body: row.body, createdAt: row.created_at, editedAt: row.edited_at ?? undefined, sender };
}

export function TextRoomPage({ room }: { room: Room }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: queryError } = await supabase.from("room_messages").select(SELECT).eq("room_id", room.id).order("created_at", { ascending: true }).limit(200);
    if (queryError) setError(queryError.message); else setMessages(((data ?? []) as unknown as MessageRow[]).map(mapMessage));
    setLoading(false);
  }, [room.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`text-room:${room.id}`).on("postgres_changes", { event: "*", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [room.id, load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault(); const body = input.trim(); if (!body || !user || sending) return;
    setSending(true); setError(null);
    const { error: sendError } = await supabase.from("room_messages").insert({ room_id: room.id, sender_id: user.id, body });
    if (sendError) setError(sendError.message); else { setInput(""); await load(); }
    setSending(false);
  }

  return <section className="flex h-full min-w-0 flex-col qp-page-enter" aria-label={`${room.name} text channel`}>
    <header className="flex min-h-14 items-center border-b border-[var(--border-subtle)] px-4 sm:px-5"><div className="min-w-0"><h1 className="truncate text-[15px] font-semibold"># {room.name}</h1>{room.topic && <p className="truncate text-[11px] text-[var(--text-tertiary)]">{room.topic}</p>}</div></header>
    <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-4" aria-live="polite">
      {loading ? <div className="flex h-full items-center justify-center"><Spinner size={20} /></div> : messages.length === 0 ? <EmptyState title={`Start #${room.name}`} description="Messages here are shared with this community in real time." /> :
        <div className="mx-auto flex max-w-3xl flex-col gap-0.5">{messages.map(message => { const isLocal = message.senderId === user?.id; const name = isLocal ? "You" : message.sender?.displayName ?? "Member"; return <article key={message.id} className="qp-participant-enter group flex gap-3 rounded-[var(--radius-sm)] px-2 py-2 hover:bg-[var(--surface-1)]/55"><Avatar displayName={name} userId={message.senderId} size="sm" className="mt-0.5 shrink-0" /><div className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className="text-[13px] font-semibold">{name}</span><time className="text-[11px] text-[var(--text-tertiary)]">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div><p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{message.body}</p></div></article>; })}</div>}
      <div ref={bottomRef} />
    </div>
    {error && <div role="alert" className="mx-4 mb-2 flex items-center gap-2 text-[12px] text-[var(--danger)]"><AlertCircle size={14} />{error}</div>}
    <form onSubmit={send} className="qp-mobile-safe-bottom flex items-end gap-2 border-t border-[var(--border-subtle)] p-3 sm:px-4"><label className="sr-only" htmlFor="room-message">Message #{room.name}</label><textarea id="room-message" rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} placeholder={`Message #${room.name}`} className="min-h-10 max-h-32 flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]" maxLength={10000} /><Button type="submit" variant="primary" size="icon" disabled={!input.trim() || sending} aria-label="Send message"><Send size={16} /></Button></form>
  </section>;
}
