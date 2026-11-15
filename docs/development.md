# Разработка

Требуются Node.js 24, npm и Git. Основной интерфейс: React, TypeScript и Three.js; сборка: Vite; Android: Capacitor. Расчёт выполняется локально в Web Worker. Необязательный сервер обмена использует Fastify и SQLite.

## Структура

- `apps/web` — интерфейс и PWA.
- `apps/share-api` — публикация планов по ссылке.
- `packages/domain` — модель проекта.
- `packages/packing` — поиск раскладки.
- `packages/validation` — проверка размещения и ограничений.
- `packages/io` — импорт и экспорт.
- `android` — Android-проект.

## Команды

```sh
npm ci
npm run dev
```

Проверки кода:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Браузерные проверки:

```sh
npx playwright install chromium webkit
PW_PREVIEW=1 npm run test:e2e
```

Перед браузерными проверками выполните `npm run build`. Для замеров производительности добавьте `PW_BENCH=1`. Если используете `PLAYWRIGHT_BROWSERS_PATH`, задавайте одинаковый путь при установке и запуске браузеров.

## Сборка Android

Нужны JDK 21 и Android SDK с платформой API 36. Укажите SDK через `ANDROID_HOME` или `android/local.properties`.

```sh
npm run android:sync
cd android
./gradlew assembleDebug
```

APK появится в `android/app/build/outputs/apk/debug/`. Для установки сборок поверх друг друга нужен один и тот же ключ подписи. Храните ключ и пароли вне репозитория. Пользовательские APK и инструкции установки находятся в [Releases](https://github.com/DedalusMoonlight/vlezet/releases).

[Размещение веб-версии и API](running.md) · [Лицензия MIT](../LICENSE)
