import test from 'node:test';
import assert from 'node:assert/strict';
import { locateScene, filmDuration, clipPlaybackTime } from '../src/utils/film.js';
import { chooseRecordingType } from '../src/utils/videoExporter.js';

test('transições e fim da timeline selecionam a cena correta', () => {
  const scenes = [{ id: 'a', duration: 6 }, { id: 'b', duration: 8 }];
  assert.equal(filmDuration(scenes), 14);
  assert.equal(locateScene(scenes, 5.99).scene.id, 'a');
  assert.equal(locateScene(scenes, 6).scene.id, 'b');
  assert.equal(locateScene(scenes, 10).localTime, 4);
  assert.equal(locateScene(scenes, 14).scene.id, 'b');
  assert.equal(locateScene([], 0).scene, null);
});
test('extensão corresponde ao formato realmente suportado', () => {
  assert.equal(chooseRecordingType({ isTypeSupported: t => t.startsWith('video/webm') }).extension, 'webm');
  assert.equal(chooseRecordingType({ isTypeSupported: t => t.startsWith('video/mp4') }).extension, 'mp4');
  assert.throws(() => chooseRecordingType({ isTypeSupported: () => false }), /compatível/);
  assert.throws(() => chooseRecordingType(null), /suporta/);
});

test('seis cenas de dez segundos preservam um minuto com clipes de oito segundos', () => {
  const scenes = Array.from({ length: 6 }, (_, id) => ({ id, duration: 10, sourceDuration: 8 }));
  assert.equal(filmDuration(scenes), 60);
  assert.equal(locateScene(scenes, 9.99).scene.id, 0);
  assert.equal(locateScene(scenes, 10).scene.id, 1);
  assert.equal(locateScene(scenes, 59.99).scene.id, 5);
  assert.equal(clipPlaybackTime(5, 8), 5);
  assert.equal(clipPlaybackTime(9.99, 8), 7.96);
  assert.equal(clipPlaybackTime(0, .02), 0);
});
