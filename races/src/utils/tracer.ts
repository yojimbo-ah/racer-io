// utils/tracer.ts
import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('races-service');