import { useNavigate } from 'react-router';
import { APP_NAME, APP_TAGLINE, DISCLAIMER } from '../../config.ts';
import { saveProfile, setActiveProfileId, uid } from '../../db/repo.ts';
import { useProfiles } from '../../state/ProfileContext.tsx';
import { Card } from '../../ui/kit.tsx';
import { defaultDraft, ProfileForm } from './ProfileForm.tsx';

export function Onboarding() {
  const navigate = useNavigate();
  const { profiles } = useProfiles();
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <img src="./favicon.svg" alt="" className="h-14 w-14" />
        <div>
          <h1 className="font-serif text-3xl font-bold">{profiles.length ? 'New profile' : `Welcome to ${APP_NAME}`}</h1>
          <p className="text-muted">{APP_TAGLINE}</p>
        </div>
      </div>
      <Card className="mb-6 border-amber/50 bg-amber-soft">
        <h2 className="mb-1 font-semibold">Before you start</h2>
        <p className="text-sm">{DISCLAIMER}</p>
        <p className="mt-2 text-sm">
          Everything stays on this device: no account, no tracking. Use <em>Settings → Export</em> to back up your progress.
        </p>
      </Card>
      <Card>
        <ProfileForm
          initial={defaultDraft()}
          submitLabel="Build my plan"
          requireDisclaimer
          onSubmit={async (d) => {
            const id = uid();
            const now = Date.now();
            await saveProfile({ ...d, id, createdAt: now, disclaimerAcceptedAt: now });
            await setActiveProfileId(id);
            navigate('/', { replace: true });
          }}
        />
      </Card>
    </main>
  );
}
