import { useState, useRef, useEffect, useCallback } from "react";
import type { DirectMessage, UserProfile } from "../../types";
import { Avatar, PresenceDot, Button, EmptyState, Spinner } from "../ui/primitives";
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
    <div className="flex gap-3 group hover:bg-[var(--surface-1)]/50 px-4 py-1 rounded-[var(--radius-sm)] transition-colors">
      <Avatar displayName={senderProfile.displayName} userId={senderProfile.id} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {isLocal ? "You" : senderProfile.displayName}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
            {formatTime(messages[0].createdAt)}
          </span>
        </div>
        {messages.map(m => (
          <p key={m.id} className="text-[13px] text-[var(--text-primary)] leading-relaxed break-words">
            {m.body}
          </p>
        ))}
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

  // Load history
  const loadMessages = useCallback(async () => {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []).map(dbToMessage));
    setLoadingMsgs(false);
  }, [conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = dbToMessage(payload.new as Record<string, unknown>);
          // Don't duplicate messages we already optimistically added
          setMessages(prev =>
            prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending || !localProfile) return;
    setSending(true);
    setInput("");

    // Optimistic insert
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

    const { data, error } = await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: localProfile.id,
      body,
    }).select().single();

    if (error) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
    } else {
      // Replace optimistic with real row (realtime may also fire; dedup handles it)
      setMessages(prev =>
        prev.map(m => m.id === tempId ? dbToMessage(data as Record<string, unknown>) : m)
      );
    }

    setSending(false);
  }

  // Group consecutive messages by sender
  const groups: Array<{ senderId: string; messages: DirectMessage[] }> = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId) {
      last.messages.push(msg);
    } else {
      groups.push({ senderId: msg.senderId, messages: [msg] });
    }
  }

  function resolveProfile(senderId: string): { profile: UserProfile | null; isLocal: boolean } {
    if (senderId === localProfile?.id) return { profile: localProfile, isLocal: true };
    if (senderId === friendId) return { profile: friend, isLocal: false };
    return { profile: null, isLocal: false };
  }

  if (!friend) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[13px] text-[var(--text-tertiary)]">Conversation not found.</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar displayName={friend.displayName} userId={friend.id} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5">
              <PresenceDot presence={friend.presence} size={9} />
            </div>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">{friend.displayName}</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">@{friend.username}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startCall(friendId, friend.displayName)}
          aria-label={`Call ${friend.displayName}`}
          leadingIcon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.9-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          }
        >
          Call
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size={20} className="text-[var(--text-tertiary)]" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            title={`Start a conversation with ${friend.displayName}`}
            description="Messages are only visible to you and them."
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            {groups.map((group, i) => {
              const { profile: senderProfile, isLocal } = resolveProfile(group.senderId);
              return (
                <MessageGroup
                  key={`${group.senderId}-${i}`}
                  messages={group.messages}
                  senderProfile={senderProfile}
                  isLocal={isLocal}
                />
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-subtle)] shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Message ${friend.displayName}`}
          className="flex-1 h-9 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] px-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          aria-label={`Message ${friend.displayName}`}
        />
        <Button type="submit" variant="primary" size="icon" loading={sending} disabled={!input.trim()} aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </Button>
      </form>
    </div>
  );
}
