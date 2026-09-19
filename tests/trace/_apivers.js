const path = require('path');
function findApi(start) {
  try {
    const p = require.resolve('@opentelemetry/api', { paths: [start] });
    const pkg = require(path.join(path.dirname(p), '..', 'package.json'));
    return { version: pkg.version, entry: p };
  } catch (e) { return { error: e.message }; }
}
console.log('APP /app resolve:', JSON.stringify(findApi('/app')));
const commonRes = require.resolve('@racer-io/common', { paths: ['/app'] });
console.log('COMMON entry:', commonRes);
const commonDir = path.dirname(commonRes);
console.log('COMMON resolve api from common:', JSON.stringify(findApi(commonDir)));
try {
  console.log('COMMON api dependency:', require('/app/node_modules/@racer-io/common/package.json').dependencies['@opentelemetry/api']);
} catch (e) { console.log('common pkg read err', e.message); }
console.log('SDK-NODE resolve api:', JSON.stringify(findApi('/app/node_modules/@opentelemetry/sdk-node')));