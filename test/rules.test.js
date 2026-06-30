/* 심사 판정 순수 로직 회귀 테스트 — 법령 임계 경계값 고정
   실행: node test/rules.test.js  (Node 18+, 빌드 도구·의존성 불필요) */
const assert = require('node:assert/strict');
const { getAuthority, getReReview } = require('../js/rules.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.error('  ✗ ' + name + '\n      ' + e.message); }
}

console.log('getAuthority — 일반투자사업(비자체) 금액 경계');
t('20억 미만 → 심사 불필요', () =>
  assert.equal(getAuthority('general', 19, false, false, 0).type, 'none'));
t('20~60억 → 자체심사', () =>
  assert.equal(getAuthority('general', 20, false, false, 0).type, 'self'));
t('60~200억 → 경기도 의뢰', () =>
  assert.equal(getAuthority('general', 60, false, false, 0).type, 'gyeonggi'));
t('200억 이상 → 중앙 의뢰', () =>
  assert.equal(getAuthority('general', 200, false, false, 0).type, 'central'));

console.log('getAuthority — 면제·특수유형');
t('국비 70% 이상 → 면제', () =>
  assert.equal(getAuthority('general', 500, false, false, 70).type, 'exempt'));
t('전액 자체재원 일반투자 → 금액 상한 없이 자체', () =>
  assert.equal(getAuthority('general', 1000, true, false, 0).type, 'self'));
t('외국자본 10억 미만 → 비대상', () =>
  assert.equal(getAuthority('foreign', 9, false, false, 0).type, 'none'));
t('외국자본 10억 이상 → 중앙', () =>
  assert.equal(getAuthority('foreign', 10, false, false, 0).type, 'central'));
t('청사 전액자체 60억 이상 → 경기도(중앙 없음)', () =>
  assert.equal(getAuthority('office', 100, true, false, 0).type, 'gyeonggi'));

console.log('getReReview — 재심사 사유');
t('500억 미만 30% 이상 증가 → 재심사 대상', () =>
  assert.equal(getReReview({ cost: 130, prevCost: 100 }).triggers.length >= 1, true));
t('500억 미만 30% 미만 증가 → 비대상', () =>
  assert.equal(getReReview({ cost: 120, prevCost: 100 }).triggers.length, 0));
t('4년 이상 지연 → 재심사 대상', () =>
  assert.equal(getReReview({ cost: 100, prevCost: 100, years: 4 })
    .triggers.some(x => /4년 이상/.test(x.t)), true));
t('기지출 25% 이상 → 재심사 제외 플래그', () =>
  assert.equal(getReReview({ cost: 130, prevCost: 100, spent: 'over25' }).excluded, true));

console.log('\n결과: ' + pass + ' 통과 / ' + fail + ' 실패');
process.exit(fail ? 1 : 0);
