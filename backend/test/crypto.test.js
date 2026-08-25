import test from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, randomToken } from '../src/utils/crypto.js';

test('tokens são aleatórios e armazenáveis apenas como hash', () => {
  const first = randomToken();
  const second = randomToken();
  assert.notEqual(first, second);
  assert.equal(hashToken(first).length, 64);
  assert.notEqual(hashToken(first), first);
});
