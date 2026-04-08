import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import test from 'node:test';

const port = 3173;
const rootUrl = `http://127.0.0.1:${port}`;

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('server did not become ready'));
    }, 10000);

    const onData = (chunk) => {
      if (String(chunk).includes('ESSA app running on')) {
        clearTimeout(timeout);
        child.stdout.off('data', onData);
        resolve();
      }
    };

    child.stdout.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`server exited early with code ${code}`));
    });
  });
}

async function fetchText(pathname) {
  const response = await fetch(`${rootUrl}${pathname}`);
  return { response, body: await response.text() };
}

function requestStatus(pathname) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(`GET ${pathname} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
    });

    let response = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      response += chunk;
    });
    socket.on('end', () => {
      const match = response.match(/^HTTP\/1\.1\s+(\d{3})/);
      resolve(Number(match?.[1] || 0));
    });
    socket.on('error', reject);
  });
}

test('serves the public site and logo asset', async () => {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForReady(child);

    const { response: rootResponse, body: rootBody } = await fetchText('/');
    assert.equal(rootResponse.status, 200);
    assert.match(rootResponse.headers.get('content-type') || '', /text\/html/);
    assert.match(rootBody, /ESSA \| Club/);

    const { response: logoResponse } = await fetchText('/logo-essa.svg');
    assert.equal(logoResponse.status, 200);
    assert.match(logoResponse.headers.get('content-type') || '', /image\/svg\+xml/);

    const { response: healthResponse, body: healthBody } = await fetchText('/health');
    assert.equal(healthResponse.status, 200);
    assert.equal(healthBody, 'ok');

    const traversalStatus = await requestStatus('/%2e%2e/%2e%2e/package.json');
    assert.equal(traversalStatus, 403);
  } finally {
    child.kill('SIGTERM');
  }
});
