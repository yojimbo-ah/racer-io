import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const normalizeCollectorUrl = () => {
  const rawUrl =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    process.env.OTEL_COLLECTOR_URL ||
    'http://otel-lgtm-srv:4318';

  return rawUrl.replace(/\/+$/, '');
};

const serviceName = process.env.OTEL_SERVICE_NAME || 'races-saga-orchestrator-service';
const collectorUrl = normalizeCollectorUrl();

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  }),
  traceExporter: new OTLPTraceExporter({ url: `${collectorUrl}/v1/traces` }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${collectorUrl}/v1/metrics` }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

if (process.env.OTEL_SDK_DISABLED !== 'true') {
  sdk.start();
}

const shutdown = async () => {
  try {
    await sdk.shutdown();
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default sdk