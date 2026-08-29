import { useMemo, useState } from "react";
import type { Room, RoomPrivacy } from "../../types";
import { useCommunities } from "../../features/communities/community-context";
import { useSocial } from "../../features/social/social-context";
import { Avatar, Button, Dialog, Input, Select, Textarea } from "../ui/primitives";

export function CreateCommunityDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (communityId: string) => void;
}) {
  const { createCommunity } = useCommunities();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createCommunity(name, description);
      setName("");
      setDescription("");
      onClose();
      onCreated?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create community");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create community">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoFocus placeholder="Friends" />
        <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What you use this space for" />
        {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!name.trim()}>Create community</Button>
        </div>
      </form>
    </Dialog>
  );
}

function FriendPicker({ selected, onChange, excludeIds = [] }: {
  selected: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
}) {
  const { friends } = useSocial();
  const accepted = useMemo(
    () => friends.filter(f => f.relation === "friends" && !excludeIds.includes(f.profile.id)),
    [friends, excludeIds],
  );

  if (accepted.length === 0) {
    return <p className="text-[12px] text-[var(--text-tertiary)]">No additional friends are available to invite.</p>;
  }

  return (
    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-1">
      {accepted.map(friend => {
        const checked = selected.includes(friend.profile.id);
        return (
          <label
            key={friend.profile.id}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(checked ? selected.filter(id => id !== friend.profile.id) : [...selected, friend.profile.id])}
              className="accent-[var(--accent)]"
            />
            <Avatar displayName={friend.profile.displayName} userId={friend.profile.id} size="sm" />
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--text-primary)] truncate">{friend.profile.displayName}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">@{friend.profile.username}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

export function CreateVoiceRoomDialog({
  open,
  communityId,
  onClose,
  onCreated,
}: {
  open: boolean;
  communityId: string;
  onClose: () => void;
  onCreated?: (roomId: string) => void;
}) {
  const { createVoiceRoom } = useCommunities();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [privacy, setPrivacy] = useState<RoomPrivacy>("community");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setTopic("");
    setPrivacy("community");
    setFriendIds([]);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const id = await createVoiceRoom({
        communityId,
        name,
        topic,
        privacy,
        friendIds,
      });
      reset();
      onClose();
      onCreated?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create voice room");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create voice channel" width="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Channel name" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoFocus placeholder="Gaming" />
        <Textarea label="Topic (optional)" value={topic} onChange={e => setTopic(e.target.value)} rows={2} placeholder="What happens in this channel" />
        <Select
          label="Access"
          value={privacy}
          onChange={value => setPrivacy(value as RoomPrivacy)}
          options={[
            { value: "community", label: "Community members" },
            { value: "invite", label: "Invite only" },
            { value: "public", label: "Public inside this community" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">Add friends</span>
          <FriendPicker selected={friendIds} onChange={setFriendIds} />
          <p className="text-[11px] text-[var(--text-tertiary)]">Invited friends are also added to this community.</p>
        </div>
        {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!name.trim()}>Create channel</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function InviteFriendsDialog({
  open,
  room,
  onClose,
}: {
  open: boolean;
  room: Room | null;
  onClose: () => void;
}) {
  const { inviteFriendsToRoom, getRoomMembers } = useCommunities();
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!room) return null;
  const roomId = room.id;
  const existing = getRoomMembers(room.id).map(p => p.id);

  async function invite() {
    if (friendIds.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const count = await inviteFriendsToRoom(roomId, friendIds);
      setFriendIds([]);
      setMessage(count === 1 ? "1 friend added." : `${count} friends added.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to add friends");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Invite to ${room.name}`} width="max-w-lg">
      <div className="flex flex-col gap-4">
        <FriendPicker selected={friendIds} onChange={setFriendIds} excludeIds={existing} />
        {message && <p className="text-[12px] text-[var(--text-secondary)]">{message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Done</Button>
          <Button variant="primary" onClick={invite} loading={saving} disabled={friendIds.length === 0}>Add friends</Button>
        </div>
      </div>
    </Dialog>
  );
}
