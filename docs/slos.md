# MVP SLOs (Service Level Objectives)

## Ingestion

- **Freshness**: Ingestion jobs for each configured source run at least once every 24 hours (scheduler interval: 1 hour; jobs are created when no pending/running job exists for the source).
- **Failure rate**: Job failures are logged with `event: job_failed`; operational goal: < 5% of job runs end in failed status.
- **Latency**: No strict latency SLO for full catalog ingestion; jobs run in the background.

## API

- **Availability**: Health endpoint `GET /api/health` reports `status: ok` when database and Meilisearch are up. Target: 99% of health checks return ok during normal operation.
- **Search latency**: P95 of `GET /api/search` response time target: < 500 ms under normal load.
- **Error rate**: Target < 1% of non-health API requests returning 5xx.

## Observability

- **Logs**: Worker emits structured JSON logs for ingestion events (`job_start`, `job_complete`, `job_failed`) with timestamps and identifiers.
- **Health**: `GET /api/health` exposes database and search status for monitoring and alerting.
- **Alerts**: Configure alerts on repeated `job_failed` events and on health endpoint returning `degraded` or database/search down.

