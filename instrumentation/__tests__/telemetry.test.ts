import { createHealthIndicator, problemDetails, createREDMetrics, isInitialized } from '../src/index';

// Mock OpenTelemetry modules
jest.mock('@opentelemetry/sdk-node', () => ({ NodeSDK: jest.fn() }));
jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({ OTLPTraceExporter: jest.fn() }));
jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({ OTLPMetricExporter: jest.fn() }));
jest.mock('@opentelemetry/exporter-prometheus', () => ({ PrometheusExporter: jest.fn() }));
jest.mock('@opentelemetry/auto-instrumentations-node', () => ({ getNodeAutoInstrumentations: jest.fn(() => []) }));
jest.mock('@opentelemetry/api', () => ({
  trace: { getTracer: jest.fn(() => ({ startActiveSpan: jest.fn() })) },
  metrics: {
    getMeter: jest.fn(() => ({
      createCounter: jest.fn(() => ({ add: jest.fn() })),
      createHistogram: jest.fn(() => ({ record: jest.fn() })),
      createUpDownCounter: jest.fn(() => ({ add: jest.fn() })),
    })),
  },
  context: {},
  SpanStatusCode: { OK: 0, ERROR: 1 },
}));

describe('createHealthIndicator', () => {
  it('returns healthy status with service name', () => {
    const indicator = createHealthIndicator('test-service');
    const status = indicator.getStatus();

    expect(status.service).toBe('test-service');
    expect(status.status).toBe('healthy');
    expect(status.uptime).toBeGreaterThanOrEqual(0);
    expect(status.timestamp).toBeDefined();
  });

  it('tracks uptime from creation', async () => {
    const indicator = createHealthIndicator('uptime-test');
    await new Promise((r) => setTimeout(r, 50));
    const status = indicator.getStatus();
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('isInitialized', () => {
  it('returns false before init', () => {
    expect(isInitialized()).toBe(false);
  });
});
