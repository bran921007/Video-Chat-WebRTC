const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {once} = require('node:events');
const {io} = require('socket.io-client');

test('room redirect, HTML and room-scoped connect/disconnect events', async () => {
  const originalListen = http.Server.prototype.listen;
  let server;
  http.Server.prototype.listen = function () {
    server = this;
    return originalListen.call(this, 0, '127.0.0.1');
  };
  try { require('../server'); }
  finally { http.Server.prototype.listen = originalListen; }
  const clients = [];
  try {
    if (!server.listening) await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    const redirect = await fetch(base, {redirect:'manual'});
    assert.equal(redirect.status, 302);
    assert.match(redirect.headers.get('location'), /^\/[0-9a-f-]{36}$/);
    const room = await fetch(`${base}/fixture-room`);
    assert.equal(room.status, 200);
    assert.match(await room.text(), /const ROOM_ID = "fixture-room"/);
    assert.equal((await fetch(`${base}/script.js`)).status, 200);
    for (let index = 0; index < 3; index++) {
      const client = io(base, {transports:['websocket'], reconnection:false});
      clients.push(client);
      await once(client, 'connect');
    }
    const [first, second, outsider] = clients;
    const unrelated = [];
    outsider.on('user-connected', user => unrelated.push(user));
    outsider.emit('join-room', 'other-room', 'outsider');
    first.emit('join-room', 'fixture-room', 'first');
    const connected = once(first, 'user-connected', {signal:AbortSignal.timeout(3000)});
    second.emit('join-room', 'fixture-room', 'second');
    assert.deepEqual(await connected, ['second']);
    const disconnected = once(first, 'user-disconnected', {signal:AbortSignal.timeout(3000)});
    second.disconnect();
    assert.deepEqual(await disconnected, ['second']);
    assert.deepEqual(unrelated, []);
  } finally {
    clients.forEach(client => client.disconnect());
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
