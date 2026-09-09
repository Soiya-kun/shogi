import assert from 'node:assert/strict';

const base = process.argv[2] || 'https://shogi-battle.com';
for (const [path, mime] of [
  ['/', 'text/html'], ['/app.js', 'javascript'], ['/match.mjs', 'javascript'],
  ['/support.mjs', 'javascript'], ['/support-config.mjs', 'javascript'], ['/support-prompt.mjs', 'javascript'],
  ['/legal.html', 'text/html'], ['/privacy.html', 'text/html'], ['/support-terms.html', 'text/html'],
  ['/ai/engine-worker.js', 'javascript'], ['/ai/vendor/yaneuraou.wasm', 'application/wasm'],
  ['/assets/army.glb', 'model/gltf-binary'], ['/coi-serviceworker.js', 'javascript'],
  ['/ai/vendor/LICENSE', null],
]) {
  const response = await fetch(new URL(path, base), {method: 'HEAD', signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  if (mime) assert(response.headers.get('content-type')?.includes(mime), `${path}: wrong MIME ${response.headers.get('content-type')}`);
  assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin', `${path}: COOP`);
  assert.equal(response.headers.get('cross-origin-embedder-policy'), 'require-corp', `${path}: COEP`);
  console.log(`${path}: OK (${response.headers.get('content-type')})`);
}
const redirect = await fetch(base.replace('https:', 'http:'), {redirect: 'manual', signal: AbortSignal.timeout(30000)});
assert([301, 302, 307, 308].includes(redirect.status), 'HTTP must redirect');
assert(redirect.headers.get('location')?.startsWith('https:'), 'Redirect must use HTTPS');
console.log('HTTP → HTTPS: OK');
