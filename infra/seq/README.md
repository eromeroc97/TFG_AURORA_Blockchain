# Seq local setup

This folder documents the local Seq setup used by the auth service.

## Docker Compose service

The `seq` container is defined in the repository root `docker-compose.yml` with:

- Ingestion endpoint: `http://localhost:5341`
- Seq UI: `http://localhost:8081`
- Persistent volume: `seq_data`

## Auth service integration

Set the following value in `services/auth/.env`:

```env
SEQ_URL=http://seq:5341
```

Seq bootstrap authentication is also read from `services/auth/.env`:

```env
SEQ_FIRSTRUN_ADMINUSERNAME=admin
SEQ_FIRSTRUN_ADMINPASSWORD=admin123456
```

When running auth outside Docker, you can use:

```env
SEQ_URL=http://localhost:5341
```

