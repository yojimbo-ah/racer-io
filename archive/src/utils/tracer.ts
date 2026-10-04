// utils/tracer.ts
import { trace } from '@opentelemetry/api';
// each service has it own tracer to show right in the graphan ui
export const tracer = trace.getTracer('archive-service');