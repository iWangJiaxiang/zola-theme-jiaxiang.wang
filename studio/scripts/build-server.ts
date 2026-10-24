import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
// Bundle JS libraries; Node built-ins remain external. The createRequire banner supports CommonJS dependencies.
const shared = { bundle: true, platform: 'node' as const, target: 'node20', format: 'esm' as const,
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } };
await build({ ...shared, entryPoints: ['server/standalone.ts'], outfile: 'dist/server.mjs' });
await mkdir('dist/client/vendor/vditor', { recursive: true });
await cp('node_modules/vditor/dist', 'dist/client/vendor/vditor/dist', { recursive: true });
await rm('dist/makers', { recursive: true, force: true });
await mkdir('dist/makers/cloud-functions/api', { recursive: true });
await cp('dist/client', 'dist/makers', { recursive: true });
await build({ ...shared, entryPoints: ['cloud-functions/api/[[default]].ts'], outfile: 'dist/makers/cloud-functions/api/[[default]].js' });
await writeFile('dist/makers/package.json', JSON.stringify({ private: true, type: 'module', engines: { node: '>=20.19' } }, null, 2));
const deployment = JSON.parse(await readFile('edgeone.json', 'utf8'));
await writeFile('dist/makers/edgeone.json', JSON.stringify({
  headers: deployment.headers, cloudFunctions: deployment.cloudFunctions,
}, null, 2));
console.log('Built standalone server and Makers artifact in dist/makers.');
