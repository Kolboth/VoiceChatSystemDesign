import { useState, useRef, useEffect } from "react";
import type { Room } from "../types";
import { MOCK_TEXT_MESSAGES, getUserById, LOCAL_USER_ID } from "../data/mock";
import { Avatar, Button, EmptyState } from "../components/ui/primitives";

interface TextRoomPageProps {
  room: Room;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type Message = typeof MOCK_TEXT_MESSAGES[number];

function MessageGroupRow({ messages }: { messages: Message[] }) {
  const sender = messages[0];
  if (sender.type === "system") {
    return (
      <div className="flex items-center gap-3 px-4 py-1">
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        <span className="text-[12px] text-[var(--text-tertiary)] shrink-0">{messages[0].content}</span>
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      </div>
    );
  }

  const user = getUserById(sender.userId);
  if (!user) return null;
  const isLocal = sender.userId === LOCAL_USER_ID;

  return (
    <div className="group flex gap-3 px-4 py-1 hover:bg-[var(--surface-1)]/40 transition-colors rounded-[var(--radius-sm)]">
      <Avatar displayName={user.displayName} userId={user.id} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{isLocal ? "You" : user.displayName}</span>
          <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">{formatTime(sender.createdAt)}</span>
        </div>
        {messages.map(m => (
          <p key={m.id} className="text-[13px] text-[var(--text-primary)] leading-relaxed break-words">
            {m.content}
          </p>
        ))}
      </div>
    </div>
  );
}

export function TextRoomPage({ room }: TextRoomPageProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(MOCK_TEXT_MESSAGES.filter(m => m.roomId === room.id));
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;
    setMessages(prev => [...prev, {
      id: `tm_${Date.now()}`,
      roomId: room.id,
      userId: LOCAL_USER_ID,
      content: body,
      createdAt: new Date().toISOString(),
      type: "message" as const,
    }]);
    setInput("");
  }

  // Group consecutive messages by sender
  const groups: Array<{ userId: string; type: "message" | "system"; messages: typeof messages }> = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.userId === m.userId && last.type === m.type && m.type !== "system") {
      last.messages.push(m);
    } else {
      groups.push({ userId: m.userId, type: m.type, messages: [m] });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">{room.name}</h1>
          {room.topic && <span className="text-[13px] text-[var(--text-tertiary)]">· {room.topic}</span>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Start the conversation." />
        ) : (
          <div className="flex flex-col gap-0.5">
            {groups.map((group, i) => (
              <MessageGroupRow key={i} messages={group.messages} />
            ))}
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
          placeholder={`Message #${room.name}`}
          className="flex-1 h-9 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] px-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          aria-label={`Message ${room.name}`}
        />
        <Button type="submit" variant="primary" size="icon" disabled={!input.trim()} aria-label="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </Button>
      </form>
    </div>
  );
}
