# Cloud Native Observability

![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-1.x-blue?style=flat-square)
![Prometheus](https://img.shields.io/badge/Prometheus-2.x-E6522C?style=flat-square&logo=prometheus)
![Grafana](https://img.shields.io/badge/Grafana-10.x-F46800?style=flat-square&logo=grafana)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

Production observability stack for microservices — traces, metrics, and logs with OpenTelemetry, Prometheus, Grafana, and Loki. Includes instrumentation library, pre-built dashboards, and alerting rules.

## Three Pillars

```
┌──────────────────────────────────────────────────────────┐
│                    Application Code                       │
│           instrumentation/ (OpenTelemetry SDK)            │
└───────┬──────────────────┬──────────────────┬────────────┘
        │                  │                  │
   ┌────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
   │  Traces   │    │   Metrics   │    │    Logs     │
   │  (Jaeger) │    │(Prometheus) │    │   (Loki)    │
   └────┬──────┘    └──────┬──────┘    └──────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Grafana   │
                    │ (Dashboards)│
                    └─────────────┘
```

## Components

| Component | Description |
|-----------|-------------|
| `instrumentation/` | OpenTelemetry SDK wrapper for Node.js services |
| `dashboards/` | Grafana dashboard JSON (RED metrics, node health) |
| `alerts/` | Prometheus alerting rules (SLO-based) |
| `collectors/` | OTel Collector configuration |
| `docker/` | Docker Compose for full observability stack |

## Quick Start

```bash
# Start observability stack
cd docker && docker compose up -d

# Grafana:    http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# Jaeger:     http://localhost:16686
```

## Instrumentation

```typescript
import { initTelemetry } from '@marwantech/observability';

initTelemetry({ serviceName: 'order-service', environment: 'production' });
```

## License

MIT
