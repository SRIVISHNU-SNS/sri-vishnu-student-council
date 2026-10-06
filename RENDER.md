# Render deployment

This app uses a local SQLite database and does not need `DATABASE_URL` or a separate database service.

## Service settings

- **Runtime:** Docker (the repository includes a Dockerfile)
- **Build command:** leave blank for Docker services
- **Start command:** leave blank to use the Dockerfile command
- **Health check path:** `/api/health`

## Persistent storage

Add a Render persistent disk to the web service:

- **Mount path:** `/var/data`
- **Size:** 1 GB or larger

Set this environment variable on the web service:

```text
SQLITE_DB_PATH=/var/data/sri-vishnu.sqlite
```

Without a persistent disk, the app will still run, but submitted applications and membership records can be lost when Render replaces the instance.

## Required environment variable

```text
ADMIN_EMAIL=the-email-used-for-admin-access@example.com
```

The database schema and seed manifesto are created automatically during startup.
