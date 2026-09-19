const api = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.INFO);

console.log('constructing');
const sdk = new NodeSDK({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'races-service' }),
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-lgtm-srv:4318/v1/traces' }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: 'http://otel-lgtm-srv:4318/v1/metrics' }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
console.log('constructed ok');
sdk.start().then(() => console.log('start resolved')).catch((e) => console.log('start rejected', e));
setTimeout(() => { console.log('exiting'); process.exit(0); }, 3000);