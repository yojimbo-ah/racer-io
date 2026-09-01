console.log("======================================");
console.log(">>> TRACING FILE LOADED");
console.log(">>> OTEL_COLLECTOR_URL =", process.env.OTEL_COLLECTOR_URL);
console.log("======================================");

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

diag.setLogger(
  new DiagConsoleLogger(),
  DiagLogLevel.DEBUG
);

console.log(">>> OpenTelemetry API loaded");

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

console.log(">>> OpenTelemetry packages loaded");

const collectorUrl =
  process.env.OTEL_COLLECTOR_URL ||
  "http://otel-lgtm-srv:4318";

console.log(">>> Collector URL:", collectorUrl);

const traceExporter = new OTLPTraceExporter({
  url: `${collectorUrl}/v1/traces`,
});

console.log(">>> Trace exporter created");

const metricExporter = new OTLPMetricExporter({
  url: `${collectorUrl}/v1/metrics`,
});

console.log(">>> Metric exporter created");

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "auth-service",
  }),

  traceExporter,

  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
  }),

  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

console.log(">>> SDK constructed");

sdk.start();

console.log(">>> OpenTelemetry SDK STARTED");

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

export default sdk;