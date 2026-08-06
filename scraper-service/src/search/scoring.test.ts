import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductName, arabicDigitsToWestern, baseForm } from './normalize';
import { scoreProduct, editDistance } from './score';

/** relevance, mirroring scrape-runner: score / query token count. */
function relevance(query: string, productName: string): number {
  const { tokens: q } = normalizeProductName(query);
  const { tokens: p } = normalizeProductName(productName);
  const s = scoreProduct(p, q);
  return q.length > 0 ? s / q.length : 0;
}

const MIN_RELEVANCE = 0.3;

test('baseForm collapses Arabic letter variants (ايفون/آيفون)', () => {
  assert.equal(baseForm('آيفون'), baseForm('ايفون'));
  assert.equal(baseForm('إيفون'), baseForm('ايفون'));
});

test('Arabic-Indic digits convert to western (١٣ → 13)', () => {
  assert.equal(arabicDigitsToWestern('١٣'), '13');
  assert.equal(baseForm('١٣'), '13');
});

test('definite article ال is stripped (الموبايل/موبايل)', () => {
  assert.equal(baseForm('الموبايل'), baseForm('موبايل'));
});

test('plural matches singular (headphones/headphone)', () => {
  assert.equal(relevance('headphones', 'Sony headphone XM5'), 1);
  assert.ok(relevance('headphones', 'headphone') >= MIN_RELEVANCE);
});

test('cross-script synonym matches (laptop/لابتوب, iphone/ايفون)', () => {
  assert.equal(relevance('laptop', 'لابتوب اتش بي'), 1);
  assert.equal(relevance('iphone', 'ايفون 13'), 1);
});

test('typo near-miss matches via edit distance (iphon → iphone)', () => {
  assert.equal(editDistance('iphone', 'iphon'), 1);
  assert.ok(editDistance('iphone', 'tablet') > 2);
});

test('deliberately unrelated pairs stay below threshold', () => {
  assert.ok(relevance('samsung tv', 'حفاضات اطفال') < MIN_RELEVANCE);
  assert.ok(relevance('لابتوب', 'حفاضات') < MIN_RELEVANCE);
});

test('wrong-model partial match is rejected', () => {
  assert.ok(relevance('iphone 13', 'موبايل آيفون 15 من ابل') < MIN_RELEVANCE);
});

test('correct multi-token match passes', () => {
  assert.ok(relevance('iphone 13', 'جراب مغناطيسي لموبايل ايفون 13') >= MIN_RELEVANCE);
  assert.ok(relevance('ايفون ١٣', 'آيفون 13') >= MIN_RELEVANCE);
});