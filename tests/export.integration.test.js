import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { createApiMiddleware } from '../server/api.js';

const run = promisify(execFile);
test('finalização real: MP4 com H.264/AAC, 30 fps e duração exata', async t => {
  const encoder = process.env.FFMPEG_PATH || 'ffmpeg';
  try { await run(encoder, ['-version'], { windowsHide: true, timeout: 15000 }); }
  catch { t.skip('FFmpeg não disponível neste ambiente.'); return; }
  const directory = await mkdtemp(join(tmpdir(), 'flow-export-test-'));
  const input = join(directory, 'input.webm'), output = join(directory, 'output.mp4');
  const middleware = createApiMiddleware();
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
  try {
    await run(encoder, ['-hide_banner', '-loglevel', 'error', '-y', '-filter_threads', '1', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:d=1:r=12', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=1', '-c:v', 'libvpx', '-threads', '1', '-c:a', 'libopus', input], { windowsHide: true, timeout: 60000 });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/export/finalize?duration=2`, { method: 'POST', body: await readFile(input) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    await writeFile(output, Buffer.from(await response.arrayBuffer()));
    // Inspect the generated file with the encoder itself, without requiring ffprobe.
    const { stderr } = await run(encoder, ['-hide_banner', '-threads', '1', '-i', output, '-f', 'null', '-'], { windowsHide: true, timeout: 60000 });
    assert.match(stderr, /Duration: 00:00:02\.00/);
    assert.match(stderr, /Video: h264/);
    assert.match(stderr, /30 fps/);
    assert.match(stderr, /Audio: aac/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep) && basename(directory).startsWith('flow-export-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
