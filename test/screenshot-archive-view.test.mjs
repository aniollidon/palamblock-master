import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rememberArchive, localSessions, localStudentData } from '../src/renderer/js/views/screens/screenshot-archive.mjs';

test('la còpia local es filtra per grup i el visor individual només rep captures de la còpia', () => {
  const image = (alumne, machineId, sessionId, time) => ({
    alumne, machineId, sessionId, timestamp: time, archivePath: `images/${time}.jpg`,
  });
  const session = rememberArchive({
    id: 'local-1', name: 'grup.pb.zip',
    session: {
      groupId: 'grup', sessions: [
        { alumne: 'anna', machineId: 'm1', sessionId: 's1', displayName: 'Anna' },
        { alumne: 'anna', machineId: 'm2', sessionId: 's2' },
      ],
      images: [image('anna', 'm1', 's1', '1'), image('bruna', 'm1', 's1', '2'),
        image('anna', 'm1', 's1', '3'), image('anna', 'm2', 's2', '4')],
    },
  });
  assert.deepEqual(localSessions('grup'), [session]);
  assert.deepEqual(localSessions('altre'), []);
  const data = localStudentData(session, 'anna');
  assert.equal(data.machines.m1.sessions[0].images.length, 2);
  assert.equal(data.machines.m1.sessions[0].imageCount, 2);
  assert.equal(data.machines.m1.sessions[0].displayName, 'Anna');
  assert.equal(data.machines.m2.sessions[0].images.length, 1);
  assert.equal(data.machines.m1.sessions[0].images[0]._archiveId, 'local-1');
});
