import { useRef, useState } from 'react';
import { APP_NAME, APP_VERSION, DISCLAIMER, INSTALL_URL, PAGES_URL, RELEASES_URL, REPO_URL } from '../../config.ts';
import { bundledContent, content } from '../../content/bundle.ts';
import { checkAppUpdate, checkContentUpdate } from '../../content/updates.ts';
import { deleteProfile, exportProgress, importProgress, saveProfile, setActiveProfileId } from '../../db/repo.ts';
import { toISODate } from '../../domain/dates.ts';
import { buildReview } from '../../domain/review.ts';
import { isNative, platform, saveTextFile } from '../../platform.ts';
import { useProfile, useProfiles } from '../../state/ProfileContext.tsx';
import { Badge, Button, ButtonLink, Card, PageHeader } from '../../ui/kit.tsx';
import { ProfileForm } from '../onboarding/ProfileForm.tsx';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'shieldup-theme';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(t: Theme) {
  try {
    if (t === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

type UpdateState =
  | { phase: 'idle' | 'checking' }
  | { phase: 'done'; content: string; contentTone: 'good' | 'bad'; reload: boolean; app?: { version: string; url: string } };

export function SettingsPage() {
  const profile = useProfile();
  const { profiles } = useProfiles();
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  async function save(filename: string, text: string): Promise<boolean> {
    try {
      return await saveTextFile(filename, text);
    } catch (e) {
      setMessage({ tone: 'bad', text: `Could not save the file: ${e instanceof Error ? e.message : String(e)}` });
      return false;
    }
  }

  async function doExport(all: boolean) {
    const data = await exportProgress(APP_VERSION, content.bundle.version.version, all ? undefined : [profile.id]);
    const who = all ? 'all-profiles' : profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'profile';
    if (!(await save(`shieldup-${who}-${toISODate(new Date())}.json`, JSON.stringify(data, null, 1)))) return;
    setMessage({ tone: 'good', text: `Exported ${data.profiles.length} profile${data.profiles.length > 1 ? 's' : ''}.` });
  }

  async function doReview() {
    const data = await exportProgress(APP_VERSION, content.bundle.version.version, [profile.id]);
    const review = buildReview({
      profile,
      questions: content.questions,
      blueprint: content.bundle.blueprint,
      attempts: data.attempts,
      cardReviews: data.cardReviews,
      sessions: data.quizSessions,
      mistakes: data.mistakes,
      progress: data.moduleProgress,
      appVersion: APP_VERSION,
      contentVersion: content.bundle.version.version,
      now: new Date(),
    });
    const text = JSON.stringify(review);
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Clipboard blocked (permissions, insecure context): the file download below still works.
    }
    const saved = await save(`shieldup-review-${toISODate(new Date())}.json`, text);
    if (saved || copied) {
      setMessage({ tone: 'good', text: copied && saved ? 'Review JSON copied to the clipboard and saved.' : copied ? 'Review JSON copied to the clipboard.' : 'Review JSON saved.' });
    }
  }

  async function doCheckUpdates() {
    setUpdate({ phase: 'checking' });
    const [c, a] = await Promise.all([checkContentUpdate(), isNative() ? checkAppUpdate() : Promise.resolve(null)]);
    const text =
      c.status === 'updated'
        ? `Content ${c.version} downloaded. Restart the app to use it.`
        : c.status === 'current'
          ? `Your content (${c.version}) is up to date.`
          : c.message;
    setUpdate({
      phase: 'done',
      content: a?.status === 'error' ? `${text} App: ${a.message}` : text,
      contentTone: c.status === 'error' ? 'bad' : 'good',
      reload: c.status === 'updated',
      ...(a?.status === 'available' && { app: { version: a.version, url: a.url } }),
    });
  }

  async function doImport(file: File) {
    try {
      const json: unknown = JSON.parse(await file.text());
      if (!window.confirm('Importing replaces any profile on this device that has the same id as one in the file. Continue?')) return;
      const r = await importProgress(json);
      setMessage({ tone: 'good', text: `Imported ${r.profiles} profile${r.profiles > 1 ? 's' : ''}.` });
    } catch (e) {
      setMessage({ tone: 'bad', text: e instanceof SyntaxError ? 'That file is not JSON.' : e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 text-lg font-bold">Profile: {profile.name}</h2>
          <ProfileForm
            key={profile.id}
            initial={profile}
            submitLabel="Save and re-plan"
            onSubmit={async (d) => {
              await saveProfile({ ...profile, ...d });
              setSavedAt(Date.now());
            }}
          />
          {savedAt && (
            <p role="status" className="mt-2 text-sm text-olive">
              Saved. Your plan has been rebuilt.
            </p>
          )}
          {profile.level === 'intermediate' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <span>
                <span className="font-semibold">M0 Foundations</span>
                <span className="block text-sm text-muted">
                  {profile.foundationsSkipped ? 'Skipped: you passed the skip-check.' : 'In your plan. Pass the 20-question skip-check (≥ 80%) to skip it.'}
                </span>
              </span>
              {profile.foundationsSkipped ? (
                <Button variant="secondary" onClick={() => void saveProfile({ ...profile, foundationsSkipped: false })}>
                  Put M0 back in my plan
                </Button>
              ) : (
                content.questions.some((q) => q.pool === 'skipcheck') && (
                  <ButtonLink to="/quiz/run?mode=skipcheck" variant="secondary">
                    Take the skip-check
                  </ButtonLink>
                )
              )}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">Profiles on this device</h2>
          <ul className="mb-3 divide-y divide-line">
            {profiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold">
                  {p.name} {p.id === profile.id && <Badge tone="accent">active</Badge>}
                </span>
                <span className="flex gap-2">
                  {p.id !== profile.id && (
                    <Button variant="secondary" onClick={() => void setActiveProfileId(p.id)}>
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${p.name}" and all its progress from this device? Export it first if you may need it again.`)) void deleteProfile(p.id);
                    }}
                  >
                    Delete
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <ButtonLink to="/welcome" variant="secondary">
            Add a profile
          </ButtonLink>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">Backup</h2>
          <p className="mb-3 text-sm text-muted">
            Your progress lives only in this browser or app. Export a file regularly, and import it to move to another device. “Export for Claude review” makes a short summary (adherence, weak tags, calibration, recent mistakes, Feynman notes) to paste into an AI tutor.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void doExport(false)}>Export this profile</Button>
            {profiles.length > 1 && (
              <Button variant="secondary" onClick={() => void doExport(true)}>
                Export all profiles
              </Button>
            )}
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              Import a file
            </Button>
            <Button variant="secondary" onClick={() => void doReview()} title="Compact summary to paste into /weekly-review or any AI tutor">
              Export for Claude review
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void doImport(f);
              }}
            />
          </div>
          {message && (
            <p role="status" className={`mt-2 text-sm ${message.tone === 'good' ? 'text-olive' : 'text-burgundy'}`}>
              {message.text}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold">Appearance</h2>
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <label key={t} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 capitalize ${theme === t ? 'border-chestnut bg-chestnut-soft' : 'border-line'}`}>
                <input
                  type="radio"
                  name="theme"
                  checked={theme === t}
                  onChange={() => {
                    setTheme(t);
                    applyTheme(t);
                  }}
                  className="accent-(--chestnut)"
                />
                {t}
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-bold">About {APP_NAME}</h2>
          <p className="text-sm">
            App {APP_VERSION} · content {content.bundle.version.version} ({content.bundle.version.date})
            {content.bundle !== bundledContent && ' · downloaded update'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" disabled={update.phase === 'checking'} onClick={() => void doCheckUpdates()}>
              {update.phase === 'checking' ? 'Checking…' : 'Check for updates'}
            </Button>
            {update.phase === 'done' && update.reload && <Button onClick={() => window.location.reload()}>Restart now</Button>}
          </div>
          {update.phase === 'done' && (
            <div role="status" className="mt-2 space-y-1 text-sm">
              <p className={update.contentTone === 'good' ? 'text-olive' : 'text-burgundy'}>{update.content}</p>
              {update.app && (
                <p>
                  App {update.app.version} is available.{' '}
                  <a href={update.app.url} target="_blank" rel="noreferrer" className="font-semibold text-chestnut underline">
                    Download it
                  </a>
                </p>
              )}
            </div>
          )}
          <p className="mt-2 text-sm">{DISCLAIMER}</p>
          <p className="mt-2 text-sm">
            Privacy: no account, no server, no analytics. Nothing leaves your device unless you export it or open a link. “Check for updates” only downloads files; it sends nothing about you.
          </p>
          <p className="mt-2 text-sm">
            Code under MIT, study content under CC BY-NC-SA 4.0.{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-semibold text-chestnut underline">
              Source code and issue tracker
            </a>
          </p>
          <p className="mt-2 text-sm">
            {platform() === 'web' ? 'Also available as a desktop app (Windows, macOS, Linux) and an Android app: ' : 'Other versions: '}
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="font-semibold text-chestnut underline">
              downloads
            </a>
            {' · '}
            <a href={INSTALL_URL} target="_blank" rel="noreferrer" className="font-semibold text-chestnut underline">
              install guide
            </a>
            {isNative() && (
              <>
                {' · '}
                <a href={PAGES_URL} target="_blank" rel="noreferrer" className="font-semibold text-chestnut underline">
                  web version
                </a>
              </>
            )}
          </p>
        </Card>
      </div>
    </>
  );
}
