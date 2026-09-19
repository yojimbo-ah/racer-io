import pkgSDK from '@opentelemetry/sdk-node';
import pkgExporter from '@opentelemetry/exporter-trace-otlp-http';
import pkgResource from '@opentelemetry/resources';
import pkgSemconv from '@opentelemetry/semantic-conventions';
import pkgApi from '@opentelemetry/api';
const { NodeSDK } = pkgSDK;
const { OTLPTraceExporter } = pkgExporter;
const { resourceFromAttributes } = pkgResource;
const { ATTR_SERVICE_NAME } = pkgSemconv;
const { trace } = pkgApi;

console.log('starting sdk');
const sdk = new NodeSDK({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'races-service' }),
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-lgtm-srv:4318/v1/traces' }),
  instrumentations: [],
});
await sdk.start();
console.log('sdk started');
const tr = trace.getTracer('manual');
tr.startActiveSpan('manual-test-from-pod', (sp) => { sp.end(); });
await new Promise((r) => setTimeout(r, 8000));
console.log('done');