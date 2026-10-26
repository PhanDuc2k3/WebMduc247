import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleAutocomplete } from './searchAutocomplete.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 10));

test('debounce cancels a request before it starts', async () => {
  const calls = [];
  const results = [];
  const cancelOld = scheduleAutocomplete(async () => { calls.push('old'); return 'old'; },
    value => results.push(value), () => {}, 5);
  cancelOld();
  const cancelNew = scheduleAutocomplete(async () => { calls.push('new'); return 'new'; },
    value => results.push(value), () => {}, 5);
  await tick();
  cancelNew();
  assert.deepEqual(calls, ['new']);
  assert.deepEqual(results, ['new']);
});

test('late response cannot replace the next query, even if transport ignores abort', async () => {
  let resolveOld;
  const old = new Promise(resolve => { resolveOld = resolve; });
  const results = [];
  const cancelOld = scheduleAutocomplete(() => old, value => results.push(value), () => {}, 0);
  await tick();
  cancelOld();
  const cancelNew = scheduleAutocomplete(async () => 'new', value => results.push(value), () => {}, 0);
  await tick();
  resolveOld('old');
  await tick();
  cancelNew();
  assert.deepEqual(results, ['new']);
});

test('current request error is reported and aborted request error is ignored', async () => {
  const errors = [];
  const cancelFailed = scheduleAutocomplete(async () => { throw new Error('current'); },
    () => {}, error => errors.push(error.message), 0);
  await tick();
  cancelFailed();
  assert.deepEqual(errors, ['current']);
  let rejectOld;
  const old = new Promise((_, reject) => { rejectOld = reject; });
  const cancelOld = scheduleAutocomplete(() => old, () => {}, error => errors.push(error.message), 0);
  await tick();
  cancelOld();
  rejectOld(new Error('obsolete'));
  await tick();
  assert.deepEqual(errors, ['current']);
});
