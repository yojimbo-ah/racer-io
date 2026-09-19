console.log('NODE_ENV=', process.env.NODE_ENV);
console.log('before require');
const sdk = await import('/app/src/tracing.ts').catch((e) => { console.log('IMPORT ERR', e); process.exit(1); });
console.log('after require');
const api = await import('@opentelemetry/api');
const tracer = api.trace.getTracer('manual-test');
const p = tracer.startActiveSpan('manual-test.span', (sp) => {
  sp.end();
  return sp;
});
console.log('span created?', !!p, 'isRecording?', p.isRecording ? undefined : undefined);
console.log('spanContext valid?', p.spanContext().traceId !== '00000000000000000000000000000000');
await new Promise((r) => setTimeout(r, 3000));
console.log('done');