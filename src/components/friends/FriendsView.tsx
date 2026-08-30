import { useState } from "react";
import { useSocial } from "../../features/social/social-context";
import { useCall } from "../../features/calls/call-context";
import type { FriendEntry, UserProfile } from "../../types";
import { Avatar, PresenceDot, Button, Input, EmptyState } from "../ui/primitives";

type FriendsTab = "online" | "all" | "pending" | "blocked";

function FriendRow({ entry, onMessage, onCall, canCall = true, onAccept, onDecline, onCancel, onRemove, onBlock, onUnblock }: {
  entry: FriendEntry;
  onMessage: () => void;
  onCall: () => void;
  canCall?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
}) {
  const { profile, relation } = entry;
  return (
    <div className="group flex min-h-12 flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-2.5 qp-interactive last:border-b-0 hover:bg-[var(--surface-2)] sm:flex-nowrap">
      <div className="relative">
        <Avatar displayName={profile.displayName} userId={profile.id} size="md" />
        <div className="absolute -bottom-0.5 -right-0.5">
          <PresenceDot presence={profile.presence} size={10} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile.displayName}</p>
        <p className="text-[12px] text-[var(--text-tertiary)] truncate">
          {relation === "incoming-request" ? "Incoming request" :
           relation === "outgoing-request" ? "Outgoing request" :
           relation === "blocked" ? "Blocked" :
           `@${profile.username} · ${profile.presence === "online" ? "Online" : profile.presence === "away" ? "Away" : profile.presence === "dnd" ? "Do not disturb" : "Offline"}`}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-70 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {relation === "friends" && (
          <>
            <Button variant="ghost" size="sm" onClick={onMessage} aria-label={`Message ${profile.displayName}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </Button>
            <Button variant="ghost" size="sm" onClick={onCall} disabled={!canCall} title={canCall ? "Start voice call" : "Call service is connecting"} aria-label={`Call ${profile.displayName}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.9-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </Button>
          </>
        )}
        {relation === "incoming-request" && (
          <>
            <Button variant="primary" size="sm" onClick={onAccept}>Accept</Button>
            <Button variant="ghost" size="sm" onClick={onDecline}>Decline</Button>
          </>
        )}
        {relation === "outgoing-request" && (
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel request</Button>
        )}
        {relation === "blocked" && (
          <Button variant="ghost" size="sm" onClick={onUnblock}>Unblock</Button>
        )}
      </div>
    </div>
  );
}

function AddFriend({ onSent }: { onSent?: () => void }) {
  const { searchUsers, sendFriendRequest, friends } = useSocial();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchUsers(query);
      setResults(res);
      if (res.length === 0) setError(`No user found matching "${query}"`);
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(userId: string) {
    try {
      await sendFriendRequest(userId);
      setSentTo(prev => new Set(prev).add(userId));
      onSent?.();
    } catch {
      setError("Failed to send request.");
    }
  }

  function getRelation(userId: string) {
    const f = friends.find(f => f.profile.id === userId);
    return f?.relation;
  }

  return (
    <div className="qp-panel-enter border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-5 py-4">
      <p className="text-[13px] text-[var(--text-secondary)] mb-3">Search by username to send a friend request.</p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="username"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1"
          aria-label="Search username"
        />
        <Button type="submit" variant="primary" size="md" loading={loading}>Search</Button>
      </form>
      {error && <p className="text-[13px] text-[var(--text-tertiary)] mt-2">{error}</p>}
      {results.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-0)]">
          {results.map(user => {
            const relation = getRelation(user.id);
            const sent = sentTo.has(user.id);
            return (
              <div key={user.id} className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-2.5 last:border-b-0">
                <Avatar displayName={user.displayName} userId={user.id} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.displayName}</p>
                  <p className="text-[12px] text-[var(--text-tertiary)]">@{user.username}</p>
                </div>
                {sent || relation === "outgoing-request" ? (
                  <span className="text-[12px] text-[var(--text-tertiary)]">Request sent</span>
                ) : relation === "friends" ? (
                  <span className="text-[12px] text-[var(--text-tertiary)]">Already friends</span>
                ) : relation === "blocked" ? (
                  <span className="text-[12px] text-[var(--danger)]">Blocked</span>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => handleSend(user.id)}>Send request</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FriendsView({ onOpenConversation }: { onOpenConversation: (convId: string, friendId: string, friendDisplayName: string) => void }) {
  const { friends, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriend, blockUser, unblockUser, getOrCreateConversation } = useSocial();
  const { startCall, peerReady } = useCall();

  async function handleOpenConversation(friendId: string, friendDisplayName: string) {
    const convId = await getOrCreateConversation(friendId);
    onOpenConversation(convId, friendId, friendDisplayName);
  }
  const [tab, setTab] = useState<FriendsTab>("online");
  const [showAddFriend, setShowAddFriend] = useState(false);

  const pending = friends.filter(f => f.relation === "incoming-request" || f.relation === "outgoing-request");
  const pendingCount = pending.length;

  const filtered = {
    online: friends.filter(f => f.relation === "friends" && (f.profile.presence === "online" || f.profile.presence === "away")),
    all: friends.filter(f => f.relation === "friends"),
    pending,
    blocked: friends.filter(f => f.relation === "blocked"),
  }[tab];

  return (
    <div className="flex h-full flex-col qp-page-enter">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--background)]/95 px-3 py-3 sm:flex-nowrap sm:px-5 sm:py-3.5">
        <div className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-4">
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Friends</h1>
          <div className="qp-toolbar order-3 flex w-full items-center gap-0.5 overflow-x-auto rounded-[var(--radius-md)] p-0.5 sm:order-none sm:w-auto">
            {(["online","all","pending","blocked"] as FriendsTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`qp-interactive relative flex-1 whitespace-nowrap rounded-[5px] px-2.5 py-1 text-[12px] capitalize sm:flex-none ${tab === t ? "bg-[var(--surface-4)] text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {t}
                {t === "pending" && pendingCount > 0 && (
                  <span className="ml-1 text-[11px] font-semibold text-[var(--accent-text)]">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddFriend(v => !v)}>
          Add friend
        </Button>
      </div>

      {/* Add friend form */}
      {showAddFriend && <AddFriend onSent={() => setShowAddFriend(false)} />}

      {/* Friend list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
        {filtered.length === 0 ? (
          <EmptyState
            title={tab === "online" ? "No friends online" : tab === "pending" ? "No pending requests" : tab === "blocked" ? "No blocked users" : "No friends yet"}
            description={tab === "all" ? "Search for people by username to add friends." : undefined}
          />
        ) : (
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-0)] text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-3 py-2">
              {tab === "online" ? `Online — ${filtered.length}` :
               tab === "all" ? `All — ${filtered.length}` :
               tab === "pending" ? `Pending — ${filtered.length}` :
               `Blocked — ${filtered.length}`}
            </div>
            {filtered.map(entry => (
              <FriendRow
                key={entry.profile.id}
                entry={entry}
                onMessage={() => handleOpenConversation(entry.profile.id, entry.profile.displayName)}
                onCall={() => startCall(entry.profile.id, entry.profile.displayName)}
                canCall={peerReady}
                onAccept={() => entry.requestId && acceptFriendRequest(entry.requestId)}
                onDecline={() => entry.requestId && declineFriendRequest(entry.requestId)}
                onCancel={() => entry.requestId && cancelFriendRequest(entry.requestId)}
                onRemove={() => removeFriend(entry.profile.id)}
                onBlock={() => blockUser(entry.profile.id)}
                onUnblock={() => unblockUser(entry.profile.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
