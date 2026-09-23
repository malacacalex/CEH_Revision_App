# Contributing

Thanks for helping. The most useful thing you can do is fix a wrong or unclear question, card or note.

## Report an error (no code needed)

Use the **Report an error** link next to the item in the app. It opens a pre-filled GitHub issue (or an email)
with the item's id and revision. Please add a **source URL** that shows the correct answer: official tool
docs, an RFC, NIST, OWASP, MITRE ATT&CK, vendor documentation or the text of a law.

## Ground rules for content

- **Original work only.** Never paste EC-Council courseware, iLabs steps, figures or tables, and never add
  "real exam", recalled or braindump questions. Pull requests that do are closed.
- Write in your own words from public sources, and cite at least one URL per item, two for exam-relevant facts.
- If sources disagree or you are not sure, set `"verify": true`. The app then shows an *unverified* badge.
- When you change an item's meaning, bump its `rev`. **Never renumber or reuse ids**: progress is stored by id.
- Questions have 4 options and one defensible answer, plausible distractors and an explanation for each
  option. Keep answer letters balanced (`npm run content:balance -- <module>`).

The file layout and the full rules are in [CLAUDE.md](CLAUDE.md) (Content conventions). The schemas are in
`src/schemas/content.ts`.

## Develop

Requirements: Node 22+.

```bash
npm install
npm run dev              # http://localhost:5173
npm run check            # lint + typecheck + unit tests + content validation: must pass
npm run content:validate -- --warnings
npm run e2e              # Playwright smoke test (PW_CHANNEL=chrome reuses an installed Chrome)
```

Open a pull request against `main`. CI runs the same checks and the smoke test.

## Native apps

The website, the desktop apps (Tauri v2, `src-tauri/`) and the Android app (Capacitor, `android/`) all use
the same `dist/` build.

- Desktop, local build: install [Rust and the Tauri prerequisites](https://v2.tauri.app/start/prerequisites/),
  then `npm run tauri dev` or `npm run tauri build`.
- Android, local build: JDK 21 and the Android SDK, then `npm run build && npm run android:sync` and open
  `android/` in Android Studio.
- Icons: `npx tsx scripts/gen-icons.ts` (web + Android), then `npx tauri icon public/icon-1024.png -o src-tauri/icons`.
- Code that behaves differently per platform (links, saving files) lives in `src/platform.ts`.

## Releases (maintainer)

1. Update `CHANGELOG.md` and bump `version` in `package.json` (Tauri and Android read it from there).
2. Commit, then tag and push: `git tag -a vX.Y.Z -m "ShieldUp X.Y.Z" && git push --follow-tags`.
3. `.github/workflows/release.yml` checks the tag matches `package.json`. It builds Windows, macOS, Linux and
   Android, then publishes a GitHub Release with SHA-256 checksums and notes from `scripts/release-notes.mjs`.

Content-only fixes do not need a release: every push to `main` redeploys the website and its
`content-pack.json`, which installed apps pick up through **Check for updates**. Bump
`content/content-version.json` so they see it.

### Android signing key (once)

Without a key, CI publishes a debug-signed APK, which phones cannot update in place. To sign releases:

```bash
keytool -genkeypair -v -keystore shieldup-release.jks -alias shieldup -keyalg RSA -keysize 4096 -validity 10000
```

Keep the `.jks` file and its passwords safe and private, outside the repository. Losing them means users must
uninstall to update. Then add these repository secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the keystore, base64-encoded (`base64 -w0 shieldup-release.jks`, or PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("shieldup-release.jks"))`) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `shieldup` |
| `ANDROID_KEY_PASSWORD` | the key password (the same as the keystore password unless you chose another) |

## Licenses

By contributing you agree that code is released under [MIT](LICENSE) and content under
[CC BY-NC-SA 4.0](content/LICENSE).
