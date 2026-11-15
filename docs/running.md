# Размещение на своём сервере

Веб-версия «Влезет» работает на компьютерах и телефонах. Расчёт выполняется в браузере. Сервер обмена нужен только для публикации планов по ссылке; без него доступны ввод грузов, импорт, расчёт, 3D, JSON и PDF.

## Запуск на компьютере

Требуются Git и Node.js 24 с npm.

```sh
git clone https://github.com/DedalusMoonlight/vlezet.git
cd vlezet
npm ci
npm run dev
```

Откройте [localhost:5173](http://localhost:5173). Для обмена по ссылке выполните в другом терминале из папки проекта:

```sh
npm run dev:api
```

В режиме разработки запросы `/api` автоматически направляются на сервер по адресу `127.0.0.1:3001`.

## Веб-версия без сервера обмена

```sh
npm run build
```

Разместите содержимое `dist/` в корне сайта на статическом хостинге с HTTPS. Настройте возврат `index.html` для неизвестных маршрутов приложения. HTTPS необходим для установки PWA и офлайн-режима; на локальном компьютере разрешён также `localhost`.

Для просмотра сборки локально выполните `npm run preview` и откройте [localhost:4173](http://localhost:4173). Это режим просмотра, а не команда запуска публичного сервера.

## Linux-сервер с обменом планами

Ниже — пример для сервера с systemd и Caddy. Нужны Git, Node.js 24, npm и [установленный Caddy](https://caddyserver.com/docs/install). Направьте DNS домена на сервер и откройте входящие порты 80 и 443. В примерах замените `load.example.com` своим доменом.

### 1. Подготовьте приложение

Из-под своего обычного пользователя с доступом к sudo:

```sh
sudo install -d -m 755 -o "$(id -un)" -g "$(id -gn)" /opt/vlezet
git clone https://github.com/DedalusMoonlight/vlezet.git /opt/vlezet
cd /opt/vlezet
npm ci
npm run build
sudo useradd --system --user-group --home-dir /var/lib/vlezet --shell /usr/sbin/nologin vlezet
```

Node.js должен быть доступен системному пользователю, а файлы проекта — доступны для чтения пользователям `vlezet` и `caddy`. Если Node установлен через менеджер версий в домашнем каталоге, установите Node 24 также в системный путь либо укажите доступный абсолютный путь к нему в сервисе.

### 2. Настройте сервис обмена

Создайте `/etc/systemd/system/vlezet-api.service`:

```ini
[Unit]
Description=Vlezet plan sharing
After=network.target

[Service]
Type=simple
User=vlezet
Group=vlezet
WorkingDirectory=/opt/vlezet
StateDirectory=vlezet
StateDirectoryMode=0700
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=HOST=127.0.0.1
Environment=PORT=3001
Environment=DATABASE_PATH=/var/lib/vlezet/snapshots.sqlite
Environment=PUBLISH_LIMIT=10
Environment=TRUST_PROXY=true
ExecStart=/usr/bin/env node --import tsx apps/share-api/src/server.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Включите сервис:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now vlezet-api
sudo systemctl status vlezet-api
```

API слушает только локальный интерфейс. `TRUST_PROXY=true` используется здесь потому, что внешние запросы принимает Caddy. Не открывайте порт 3001 наружу при такой настройке.

### 3. Настройте HTTPS и маршруты

Добавьте в `/etc/caddy/Caddyfile`:

```caddyfile
load.example.com {
    encode zstd gzip

    handle /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        root * /opt/vlezet/dist
        try_files {path} /index.html
        file_server
    }
}
```

Проверьте и примените конфигурацию:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy получает и обновляет HTTPS-сертификат автоматически при доступном домене и портах. Откройте сайт, рассчитайте план, опубликуйте ссылку и проверьте её в другом браузере. Маршруты `/api/*` должны попадать в API, а `/s/*` — открывать веб-приложение. Подробнее: [схемы конфигурации Caddy](https://caddyserver.com/docs/caddyfile/patterns).

Не включайте журналирование полных URL опубликованных планов: ссылки содержат токены доступа. В приведённой конфигурации access log не включён.

## Настройки API

| Переменная      | По умолчанию       | Назначение                                       |
| --------------- | ------------------ | ------------------------------------------------ |
| `HOST`          | `127.0.0.1`        | Интерфейс прослушивания                          |
| `PORT`          | `3001`             | Порт API                                         |
| `DATABASE_PATH` | `snapshots.sqlite` | Путь к SQLite на постоянном диске                |
| `PUBLISH_LIMIT` | `10`               | Число публикаций с одного IP за час              |
| `TRUST_PROXY`   | `false`            | Доверие заголовкам контролируемого reverse proxy |

Пример переменных находится в [`.env.example`](../.env.example). Файл `.env` не загружается автоматически. Передавайте переменные через менеджер процессов или запускайте из корня репозитория:

```sh
node --env-file=.env --import tsx apps/share-api/src/server.ts
```

Снимки доступны 30 дней, после чего истекают и удаляются ежедневной очисткой. Максимальный размер запроса — 1 МиБ. Секрет удаления хранится у автора отдельно от проекта; сервер хранит его хеш. База содержит опубликованные планы, поэтому резервные копии также должны оставаться приватными.

## Резервные копии и обновление

Для согласованной резервной копии используйте SQLite Online Backup API либо остановите `vlezet-api` и скопируйте весь каталог `/var/lib/vlezet`, включая файлы WAL/SHM, если они остались. После копирования запустите сервис. Не копируйте только основной файл активной базы.

Перед обновлением сохраните резервную копию. Затем в `/opt/vlezet` выполните:

```sh
git pull --ff-only
npm ci
npm run build
sudo systemctl restart vlezet-api
```

При восстановлении остановите сервис, верните файлы в `/var/lib/vlezet`, восстановите владельца `vlezet:vlezet` и запустите сервис. Проверьте открытие ранее опубликованного плана. Проекты, которые пользователи не публиковали, хранятся на их устройствах и в серверную копию не входят.

[На главную](../README.md) · [Руководство пользователя](guide.md)
