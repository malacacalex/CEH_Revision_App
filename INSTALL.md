# Installing ShieldUp

ShieldUp is free and works offline. Pick one:

| You have | Best option |
|---|---|
| Any device with a browser | **Web app**: open https://malacacalex.github.io/CEH_Revision_App/. Nothing to install; you can add it to your home screen or desktop. |
| iPhone / iPad | Web app only: in Safari, **Share → Add to Home Screen**. |
| Windows, macOS, Linux | Desktop app from the [latest release](https://github.com/malacacalex/CEH_Revision_App/releases/latest). |
| Android | APK from the [latest release](https://github.com/malacacalex/CEH_Revision_App/releases/latest). |

Your progress is stored **only on the device and in the app you use**. The web app and the desktop app do
not share progress. To move it, use **Settings → Backup → Export**, then **Import** on the other device or app.

## Why do I see security warnings?

The installers are **not code-signed**: signing certificates cost money every year, and ShieldUp is a free
hobby project. Your system therefore cannot tell who published the file and warns you. The steps below get
past the warning. Only follow them for files downloaded from the
[official releases page](https://github.com/malacacalex/CEH_Revision_App/releases), and check the checksum
if you want to be sure the file was not altered (see the end of this page).

## Windows 10 / 11

1. Download `ShieldUp_<version>_x64-setup.exe`. The `.msi` works too, for managed PCs.
2. Run it. If **"Windows protected your PC"** (SmartScreen) appears, click **More info → Run anyway**.
3. The installer needs no admin rights and installs for your user only. It may download Microsoft Edge
   WebView2 if your PC does not have it (Windows 11 already does).

Uninstall from **Settings → Apps**.

## macOS 11 or later

1. Download `ShieldUp_<version>_universal.dmg`. It runs on both Intel and Apple silicon Macs.
2. Open it and drag **ShieldUp** into **Applications**.
3. On first launch macOS says it cannot verify the developer. Click **Done** (not "Move to Bin").
4. Open **System Settings → Privacy & Security**, scroll down to the message about ShieldUp, and click
   **Open Anyway**. Confirm with your password. After that it opens normally.

If macOS says the app **"is damaged"**, run this once in Terminal, then open it again:

```bash
xattr -dr com.apple.quarantine /Applications/ShieldUp.app
```

## Linux

- **AppImage** (any distribution): download `ShieldUp_<version>_amd64.AppImage`, then
  `chmod +x ShieldUp_*.AppImage` and run it. Some distributions need `libfuse2` (Ubuntu 22.04+:
  `sudo apt install libfuse2`).
- **Debian / Ubuntu**: `sudo apt install ./ShieldUp_<version>_amd64.deb`, then start ShieldUp from your
  applications menu.

## Android 7 or later

1. On your phone, download `ShieldUp_<version>_android.apk`.
2. Open it. Android asks you to allow your browser (or file manager) to **install unknown apps**: tap
   **Settings**, turn on **Allow from this source**, and go back.
3. Tap **Install**. If Google Play Protect warns about an unknown app, tap **More details → Install anyway**.
4. Afterwards you can turn "install unknown apps" off again.

To update, install the newer APK over the old one; your progress is kept. The only exception is a file named
`…android-debug.apk` (a test build): it cannot update an existing install. Export your progress,
uninstall, install the new one, then import.

Android's cloud backup is turned off for ShieldUp, so your progress stays on the phone. Export it before
you uninstall the app or change phones.

## Updates

- **Content** (questions, notes, fixes): **Settings → About → Check for updates**. It downloads the latest
  content, checks it, and uses it after a restart. You do not need to reinstall anything.
- **App**: the same button in the desktop and Android apps shows a download link when a new version is out.
  The web app updates itself.

Checking for updates only downloads files. It sends nothing about you or your progress.

## Checking a download (optional)

Each release lists SHA-256 checksums (`SHA256SUMS.txt`). Compare the file's hash with the list:

- Windows (PowerShell): `Get-FileHash .\ShieldUp_<version>_x64-setup.exe`
- macOS: `shasum -a 256 ShieldUp_<version>_universal.dmg`
- Linux: `sha256sum ShieldUp_<version>_amd64.AppImage`

## Problems?

[Open an issue](https://github.com/malacacalex/CEH_Revision_App/issues) with your system and what you saw.
For a wrong question or note, use the **Report an error** link next to it in the app.

---

ShieldUp is an independent, unofficial study aid. It is not affiliated with, sponsored by or endorsed by
EC-Council.
