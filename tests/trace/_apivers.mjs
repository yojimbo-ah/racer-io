const path = require('path');
function findApi(start) {
  try {
    const p = require.resolve('@opentelemetry/api', { paths: [start] });
    const pkg = require(path.join(path.dirname(p), '..', 'package.json'));
    return { version: pkg.version, path: p };
  } catch (e) { return { error: e.message }; }
}
console.log('APP /app resolve:', findApi('/app'));
console.log('\nCOMMON location:');
const commonRes = require.resolve('@racer-io/common', { paths: ['/app'] });
console.log(' ', commonRes);
const commonDir = path.dirname(commonRes);
console.log('common dir:', commonDir);
console.log('COMMON resolve api from common src:', findApi(commonDir));
console.log('COMMON package api dep:', (() => { try { return require('/app/node_modules/@racer-io/common/package.json').dependencies['@opentelemetry/api']; } catch(e){ return 'n/a '+e.message; } })());
// sdk-node's own api
console.log('SDK-NODE resolve api:', findApi('/app/node_modules/@opentelemetry/sdk-node'));