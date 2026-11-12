'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { Profile } from '@/domain/types';
import { Logo } from '@/components/layout/Sidebar';
import { IconButton } from '@/components/ui/IconButton';

export interface ProfileCardProps {
  profile: Profile;
  /** Absent : le nom n'est pas modifiable. */
  onRename?: (displayName: string) => void | Promise<unknown>;
}

export function ProfileCard({ profile, onRename }: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.displayName);

  const commit = async () => {
    const v = draft.trim();
    if (v && v !== profile.displayName) await onRename?.(v);
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-surface shadow-card">
        <Logo className="size-12" />
      </span>
      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            void commit();
          }}
        >
          <label htmlFor="profile-name" className="sr-only">
            Nom affiché
          </label>
          <input
            id="profile-name"
            value={draft}
            maxLength={60}
            data-autofocus
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(profile.displayName);
                setEditing(false);
              }
            }}
            className="w-40 rounded-xl border-2 border-line bg-surface px-3 py-2 text-center text-base font-medium text-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
          <IconButton type="submit" label="Enregistrer le nom" icon={<Check className="size-4" />} />
          <IconButton
            label="Annuler"
            icon={<X className="size-4" />}
            onClick={() => {
              setDraft(profile.displayName);
              setEditing(false);
            }}
          />
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <p className="line-clamp-2 font-display text-xl font-semibold text-ink">{profile.displayName}</p>
          {onRename && (
            <IconButton
              label="Renommer le profil"
              icon={<Pencil className="size-4" />}
              onClick={() => {
                setDraft(profile.displayName);
                setEditing(true);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
