import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db.ts';
import { content } from '../content/bundle.ts';
import type { Profile } from '../schemas/progress.ts';
import { computeSnapshot, type Snapshot, type StudyData } from './snapshot.ts';

interface ProfileState {
  loading: boolean;
  profiles: Profile[];
  profile: Profile | null;
}

const ProfileCtx = createContext<ProfileState>({ loading: true, profiles: [], profile: null });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const state = useLiveQuery(async () => {
    const profiles = await db.profiles.toArray();
    const active = (await db.settings.get('activeProfileId'))?.value;
    const profile = profiles.find((p) => p.id === active) ?? profiles[0] ?? null;
    return { profiles, profile };
  }, []);
  const value = useMemo<ProfileState>(
    () => (state ? { loading: false, profiles: state.profiles, profile: state.profile } : { loading: true, profiles: [], profile: null }),
    [state],
  );
  return <ProfileCtx.Provider value={value}>{children}</ProfileCtx.Provider>;
}

export function useProfiles(): ProfileState {
  return useContext(ProfileCtx);
}

/** The active profile. Only use under routes guarded by <RequireProfile>. */
export function useProfile(): Profile {
  const { profile } = useContext(ProfileCtx);
  if (!profile) throw new Error('No active profile');
  return profile;
}

export function useStudyData(profileId: string): StudyData | undefined {
  return useLiveQuery(async () => {
    const [attempts, srs, moduleProgress, sessions, cardReviews] = await Promise.all([
      db.attempts.where('profileId').equals(profileId).toArray(),
      db.srs.where('profileId').equals(profileId).toArray(),
      db.moduleProgress.where('profileId').equals(profileId).toArray(),
      db.quizSessions.where('profileId').equals(profileId).toArray(),
      db.cardReviews.where('profileId').equals(profileId).toArray(),
    ]);
    return { attempts, srs, moduleProgress, sessions, cardReviews };
  }, [profileId]);
}

/** Live, derived study state (plan, gates, readiness, due reviews). Recomputed whenever progress changes. */
export function useSnapshot(): { profile: Profile; data: StudyData; snap: Snapshot } | undefined {
  const profile = useProfile();
  const data = useStudyData(profile.id);
  return useMemo(() => (data ? { profile, data, snap: computeSnapshot(profile, data, content, new Date()) } : undefined), [profile, data]);
}
