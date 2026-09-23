---
description: Bump versions, update the changelog, tag and check the CI builds
argument-hint: [app version] [content version]
---
Prepare a release. Arguments (optional): **$ARGUMENTS**. Answer in French.

1. `git status` must be clean and on `main`, in sync with `origin/main`.
2. Run `npm run check`, `npm run build` and the e2e smoke (`PW_CHANNEL=chrome npm run e2e` locally).
   Stop on any failure.
3. **Versions** (semver, app and content are separate):
   - app: `package.json` `version` (and the Tauri / Capacitor configs once they exist);
   - content: `content/content-version.json` (`version`, `date`).
   If no versions were given, propose them from the changes since the last tag and ask the owner.
4. **Changelog:** add a section to `CHANGELOG.md` (create it if missing) from `git log <last tag>..HEAD`:
   Added / Changed / Fixed / Content, in plain English.
5. Show the diff and the tag name (`vX.Y.Z`) and ask the owner before committing, tagging and pushing:
   `git commit`, `git tag -a vX.Y.Z -m "…"`, `git push --follow-tags`.
6. **CI:** watch the workflows for the tag (`gh run list`, or the public API
   `https://api.github.com/repos/malacacalex/CEH_Revision_App/actions/runs`). Check that the Pages deploy
   succeeded and that the release has every installer the pipeline is meant to produce (Windows, macOS,
   Linux, Android APK once milestone 3 lands). Report what is missing.
7. Update the release status and session log in `CLAUDE.md`.
