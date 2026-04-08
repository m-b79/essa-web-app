import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStandings,
  groupByDate,
  readCachedSnapshot,
  writeCachedSnapshot,
  sortByDateAsc,
} from '../logic.mjs';

function makeStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    has(key) {
      return store.has(key);
    },
  };
}

test('groupByDate groups matches by day', () => {
  const grouped = groupByDate([
    { date: '2026-04-08T10:00:00Z', id: 1 },
    { initial_date: '2026-04-08T18:30:00Z', id: 2 },
    { id: 3 },
  ]);

  assert.equal(grouped['2026-04-08'].length, 2);
  assert.equal(grouped.inconnu.length, 1);
});

test('sortByDateAsc orders older matches first', () => {
  const sorted = [
    { date: '2026-04-10T10:00:00Z' },
    { date: '2026-04-08T10:00:00Z' },
  ].sort(sortByDateAsc);

  assert.equal(sorted[0].date, '2026-04-08T10:00:00Z');
});

test('buildStandings computes ranks and points', () => {
  const standings = buildStandings([
    {
      home: { club: { cl_no: 1 }, short_name: 'A', number: 1 },
      away: { club: { cl_no: 2 }, short_name: 'B', number: 1 },
      home_score: 2,
      away_score: 1,
    },
    {
      home: { club: { cl_no: 2 }, short_name: 'B', number: 1 },
      away: { club: { cl_no: 3 }, short_name: 'C', number: 1 },
      home_score: 0,
      away_score: 0,
    },
  ]);

  assert.equal(standings[0].name, 'A');
  assert.equal(standings[0].points, 3);
  assert.equal(standings[1].name, 'C');
  assert.equal(standings[1].points, 1);
  assert.equal(standings[2].name, 'B');
  assert.equal(standings[2].points, 1);
});

test('cache helpers expire stale snapshots', () => {
  const storage = makeStorage();
  const key = 'cache-key';
  const fresh = { fetchedAt: '2026-04-08T00:00:00.000Z', foo: 'bar' };
  writeCachedSnapshot(storage, key, fresh);

  const freshResult = readCachedSnapshot(storage, key, Date.parse('2026-04-08T12:00:00.000Z'));
  assert.deepEqual(freshResult, { snapshot: fresh, expired: false });

  const staleResult = readCachedSnapshot(storage, key, Date.parse('2026-04-10T00:00:00.000Z'));
  assert.deepEqual(staleResult, { snapshot: null, expired: true });
  assert.equal(storage.has(key), false);
});
