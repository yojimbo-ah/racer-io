import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const collectorUrl = process.env.OTEL_COLLECTOR_URL || 'http://otel-lgtm-srv:4318';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'races-service',
  }),
  traceExporter: new OTLPTraceExporter({ url: `${collectorUrl}/v1/traces` }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${collectorUrl}/v1/metrics` }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// lunching opentelementry monitering
sdk.start();

process.on('SIGTERM', () => sdk.shutdown().finally(() => process.exit(0)));
export default sdk