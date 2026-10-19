import test from 'node:test';
import assert from 'node:assert/strict';
import { locateScene, filmDuration } from '../src/utils/film.js';
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
