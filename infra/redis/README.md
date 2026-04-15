# Redis Infrastructure

This folder contains the Redis configuration used by `docker-compose.yml`.

- `redis.conf`: runtime server configuration mounted into the Redis container.

Current setup is intended for local/dev environments.
For production:

1. Enable ACL/password authentication.
2. Avoid exposing `6379` publicly.
3. Restrict traffic using private networks and firewall rules.
