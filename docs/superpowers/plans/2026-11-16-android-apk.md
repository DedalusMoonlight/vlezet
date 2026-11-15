# Android APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Последовательное исполнение в текущем чате, как ранее выбрано пользователем.

**Goal:** Устанавливаемый Android APK в GitHub Actions artifacts.
**Architecture:** Capacitor 8 bundles Vite output; existing offline domain/worker code; native export adapter; no remote server URL.
**Tech Stack:** React/TypeScript/Vite, Capacitor 8, Android Gradle, JDK 21, GitHub Actions.
**Spec:** docs/superpowers/specs/2026-11-16-android-apk-design.md

## Global Constraints
- appId app.vlezet.preview; appName Влезет; min SDK 26; existing PWA preserved.
- Debug distribution only, private repository, artifacts retained 30 days.
- No keystore or signing passwords in git/artifacts. CI debug key cache is best effort.
- Build/version code based on GitHub run number; no server.url or live-reload dependencies.

## Review Focus
- No network on first launch: all fonts/workers/chunks bundled, no native service worker.
- Export file and cancellation: native bridge errors must not become unhandled promises.
- Downloadable APK: valid signing, installable manifest, clear artifact path.
- Updates/data: document debug key cache loss and JSON backup, native storage distinct from browser.
- Cutouts/system bars and unavailable snapshot API: no hidden controls or fake localhost links.

## Task 1: Native shell and platform behavior
Files: capacitor.config.ts, android/**, apps/web/vite.config.ts, apps/web/src/PwaStatus.tsx, apps/web/src/platform/**, package.json.
- [ ] Add platform-mode tests and native build configuration checks, observe failing tests.
- [ ] Install pinned Capacitor 8 packages and generate Android project. Bundle output to dist-android, disable PWA plugin there, configure min SDK/version and app icon/system insets.
- [ ] Native status and snapshot limitation; test, typecheck and commit.

## Task 2: Native file export
Files: apps/web/src/features/import/download.ts and callers; apps/web/src/platform/exportFile.ts + tests.
- [ ] Test native base64 file write/share sequencing and failure handling; RED.
- [ ] Implement cache/filesystem/share adapter, await/catch in PDF, JSON, template and deletion-secret export. Browser path unchanged.
- [ ] Run unit and browser checks, build native web bundle and cap sync, commit.

## Task 3: APK build and emulator verification
Files: .github/workflows/android.yml, android/app/src/androidTest/**, docs/android.md, README.md.
- [ ] Add Android instrumentation smoke: launch, bundled page, calculate, persisted reload/offline.
- [ ] CI npm ci/checks/build:android + cap sync, JDK/SDK, cached debug keystore, assembleDebug, signature/manifest checks and install/emulator smoke.
- [ ] Upload vlezet-debug APK, SHA256, build info; CI permissions contents:read, timeout/concurrency bounded. Only push/manual triggers.
- [ ] Verify actual successful run and downloadable artifact. Document install/update/private-login instructions.

## Task 4: Final review and delivery
- [ ] Independent review of Android delta, fix Important findings with regression tests.
- [ ] Commit/push final code, verify final APK CI, give exact artifact/run link, state physical-phone limits.
