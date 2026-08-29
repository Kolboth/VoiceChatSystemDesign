import { useState, useRef, useEffect, useCallback } from "react";
import { MoreHorizontal, Phone, Send } from "lucide-react";
import type { DirectMessage, UserProfile } from "../../types";
import { Avatar, PresenceDot, Button, EmptyState, Spinner, Tooltip } from "../ui/primitives";
import { useCall } from "../../features/calls/call-context";
import { useAuth } from "../../features/auth/auth-context";
import { useSocial } from "../../features/social/social-context";
import { supabase } from "../../lib/supabase";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageGroup({ messages, senderProfile, isLocal }: {
  messages: DirectMessage[];
  senderProfile: UserProfile | null;
  isLocal: boolean;
}) {
  if (!senderProfile) return null;
  return (
    <div className="group flex gap-3 px-3 py-2 qp-interactive hover:bg-[var(--surface-1)]/70">
      <Avatar displayName={senderProfile.displayName} userId={senderProfile.id} avatarUrl={senderProfile.avatarUrl} size="sm" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-baseline gap-2">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">{isLocal ? "You" : senderProfile.displayName}</span>
          <span className="tabular-nums text-[10px] text-[var(--text-tertiary)]">{formatTime(messages[0].createdAt)}</span>
        </div>
        <div className="space-y-0.5">
          {messages.map(m => (
            <div key={m.id} className="flex items-start gap-2">
              <p className="min-w-0 flex-1 break-words text-[13px] leading-[1.55] text-[var(--text-primary)]">{m.body}</p>
              {m.status === "sending" && <span className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">Sending</span>}
              {m.status === "failed" && <span className="mt-0.5 text-[10px] text-[var(--danger)]">Failed</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DirectConversationProps {
  conversationId: string;
  friendId: string;
  friendDisplayName?: string;
}

export function DirectConversation({ conversationId, friendId, friendDisplayName }: DirectConversationProps) {
  const { profile: localProfile } = useAuth();
  const { friends } = useSocial();
  const { startCall } = useCall();

  const friendEntry = friends.find(f => f.profile.id === friendId);
  const friend: UserProfile | null = friendEntry?.profile ?? (
    friendDisplayName ? {
      id: friendId,
      username: friendId,
      displayName: friendDisplayName,
      presence: "offline",
      createdAt: "",
      audioSetupComplete: true,
    } : null
  );

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function dbToMessage(row: Record<string, unknown>): DirectMessage {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      senderId: row.sender_id as string,
      body: row.body as string,
      createdAt: row.created_at as string,
      editedAt: (row.edited_at as string | null) ?? undefined,
      status: "sent",
    };
  }

  const loadMessages = useCallback(async () => {
    setLoadingMsgs(true);
    const { data } = await supabase.from("direct_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    setMessages((data ?? []).map(dbToMessage));
    setLoadingMsgs(false);
  }, [conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` }, payload => {
        const incoming = dbToMessage(payload.new as Record<string, unknown>);
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending || !localProfile) return;
    setSending(true);
    setInput("");

    const tempId = `temp_${Date.now()}`;
    const optimistic: DirectMessage = {
      id: tempId,
      conversationId,
      senderId: localProfile.id,
      body,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase.from("direct_messages").insert({ conversation_id: conversationId, sender_id: localProfile.id, body }).select().single();
    if (error) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? dbToMessage(data as Record<string, unknown>) : m));
    }
    setSending(false);
  }

  const groups: Array<{ senderId: string; messages: DirectMessage[] }> = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId) last.messages.push(msg);
    else groups.push({ senderId: msg.senderId, messages: [msg] });
  }

  function resolveProfile(senderId: string): { profile: UserProfile | null; isLocal: boolean } {
    if (senderId === localProfile?.id) return { profile: localProfile, isLocal: true };
    if (senderId === friendId) return { profile: friend, isLocal: false };
    return { profile: null, isLocal: false };
  }

  if (!friend) return <div className="flex flex-1 items-center justify-center"><p className="text-[13px] text-[var(--text-tertiary)]">Conversation not found.</p></div>;

  return (
    <div className="flex h-full flex-col qp-page-enter">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--background)]/95 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <Avatar displayName={friend.displayName} userId={friend.id} avatarUrl={friend.avatarUrl} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5"><PresenceDot presence={friend.presence} size={8} /></div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{friend.displayName}</p>
            <p className="truncate text-[10px] text-[var(--text-tertiary)]">@{friend.username} · {friend.presence === "online" ? "Online" : friend.presence}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => startCall(friendId, friend.displayName)} aria-label={`Call ${friend.displayName}`} leadingIcon={<Phone size={13} />}>
            Call
          </Button>
          <Tooltip label="Conversation options" side="bottom">
            <button aria-label="Conversation options" className="qp-interactive flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]">
              <MoreHorizontal size={15} />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-3">
        {loadingMsgs ? (
          <div className="flex h-full items-center justify-center"><Spinner size={18} className="text-[var(--text-tertiary)]" /></div>
        ) : messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-lg items-center justify-center px-5">
            <EmptyState title={`Start a conversation with ${friend.displayName}`} description="Send a message or start a voice call." />
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-0.5 px-3">
            {groups.map((group, i) => {
              const { profile: senderProfile, isLocal } = resolveProfile(group.senderId);
              return <MessageGroup key={`${group.senderId}-${i}`} messages={group.messages} senderProfile={senderProfile} isLocal={isLocal} />;
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-0)]/80 px-4 py-3">
        <form onSubmit={handleSend} className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="flex min-h-9 flex-1 items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 transition-colors focus-within:border-[var(--accent)]/70 focus-within:ring-1 focus-within:ring-[var(--accent)]/25">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Message ${friend.displayName}`}
              className="h-9 w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              aria-label={`Message ${friend.displayName}`}
            />
          </div>
          <Button type="submit" variant="primary" size="icon" loading={sending} disabled={!input.trim()} aria-label="Send message">
            <Send size={15} />
          </Button>
        </form>
      </div>
    </div>
  );
}
