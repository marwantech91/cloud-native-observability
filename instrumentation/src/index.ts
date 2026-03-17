/**
 * OpenTelemetry Instrumentation Library
 *
 * Unified setup for traces, metrics, and logs.
 * Auto-instruments: HTTP, Express, MongoDB, Redis, gRPC.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';
import {
  PeriodicExportingMetricReader,
  MeterProvider,
} from '@opentelemetry/sdk-metrics';
import { trace, metrics, context, SpanStatusCode, Span } from '@opentelemetry/api';

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  otlpEndpoint?: string;
  prometheusPort?: number;
  enableTraces?: boolean;
  enableMetrics?: boolean;
  sampleRate?: number;
}

let sdk: NodeSDK | null = null;

export function initTelemetry(config: TelemetryConfig): void {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = 'development',
    otlpEndpoint = 'http://localhost:4318',
    prometheusPort = 9464,
    enableTraces = true,
    enableMetrics = true,
    sampleRate = 1.0,
  } = config;

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
  });

  const traceExporter = enableTraces
    ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
    : undefined;

  const metricReader = enableMetrics
    ? new PrometheusExporter({ port: prometheusPort })
    : undefined;

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`Telemetry initialized for ${serviceName} (${environment})`);

  process.on('SIGTERM', () => shutdown());
  process.on('SIGINT', () => shutdown());
}

export async function shutdown(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    console.log('Telemetry shut down');
  }
}

// === Custom Metrics Helpers ===

export function createCounter(name: string, description: string) {
  return metrics.getMeter('app').createCounter(name, { description });
}

export function createHistogram(name: string, description: string, unit?: string) {
  return metrics.getMeter('app').createHistogram(name, { description, unit });
}

export function createGauge(name: string, description: string) {
  return metrics.getMeter('app').createUpDownCounter(name, { description });
}

// === Tracing Helpers ===

export function getTracer(name?: string) {
  return trace.getTracer(name || 'app');
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        span.setAttribute(key, value);
      }
    }

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// === RED Metrics (Rate, Errors, Duration) ===

export function createREDMetrics(prefix: string) {
  const requestCounter = createCounter(
    `${prefix}_requests_total`,
    'Total number of requests'
  );

  const errorCounter = createCounter(
    `${prefix}_errors_total`,
    'Total number of errors'
  );

  const durationHistogram = createHistogram(
    `${prefix}_duration_seconds`,
    'Request duration in seconds',
    's'
  );

  return {
    recordRequest(method: string, path: string, statusCode: number, duration: number) {
      const attrs = { method, path, status_code: statusCode };
      requestCounter.add(1, attrs);

      if (statusCode >= 400) {
        errorCounter.add(1, attrs);
      }

      durationHistogram.record(duration / 1000, attrs);
    },
  };
}

// === Express Middleware for RED Metrics ===

export function metricsMiddleware(prefix = 'http') {
  const red = createREDMetrics(prefix);

  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      red.recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
    });

    next();
  };
}
