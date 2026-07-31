import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../admin/numerology.js');

const calculator = globalThis.ClowNumerology;
assert.ok(calculator, 'Numerology calculator should be available');

const handwrittenExample = calculator.calculate('Trần Minh Tú', '1984-03-03');
assert.equal(handwrittenExample.metrics.lifePath.display, '1');
assert.equal(handwrittenExample.metrics.birthday.display, '3');
assert.equal(handwrittenExample.metrics.mission.display, '3');
assert.equal(handwrittenExample.metrics.soul.display, '13/4');
assert.equal(handwrittenExample.metrics.personality.display, '8');
assert.equal(handwrittenExample.metrics.attitude.display, '6');
assert.equal(handwrittenExample.metrics.maturity.display, '4');
assert.equal(handwrittenExample.metrics.lifePath.formula, '3 + 3 + 22 = 28 → 1');
assert.equal(handwrittenExample.metrics.mission.formula, '8 + 8 + 5 = 21 → 3');
assert.equal(handwrittenExample.metrics.soul.formula, '1 + 9 + 3 = 13 → 13/4');
assert.equal(handwrittenExample.metrics.personality.formula, '7 + 8 + 2 = 17 → 8');
assert.equal(handwrittenExample.metrics.attitude.formula, '3 + 3 = 6');
assert.equal(handwrittenExample.metrics.maturity.formula, '1 + 3 = 4');
assert.deepEqual(handwrittenExample.missing, [2, 5, 6, 7]);
assert.deepEqual(handwrittenExample.karmicDebts, [
  { display: '13/4', sources: ['Chỉ số linh hồn'] },
]);

const allKarmicDebts = ['13/4', '14/5', '16/7', '19/1'];
for (const debt of allKarmicDebts) {
  const raw = Number(debt.split('/')[0]);
  assert.equal(calculator.resolveFinalNumber(raw, true).display, debt);
}

assert.equal(calculator.normalizeVietnameseName('Đặng Mỹ Ý'), 'dang my y');
assert.throws(
  () => calculator.calculate('Khách tương lai', '2999-01-01'),
  /tương lai/
);

const [adminHtml, adminApp, adminCss] = await Promise.all([
  readFile(new URL('../admin/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../admin/app.js', import.meta.url), 'utf8'),
  readFile(new URL('../admin/style.css', import.meta.url), 'utf8'),
]);
assert.ok(
  adminHtml.indexOf('/admin/numerology.js') < adminHtml.indexOf('/admin/app.js'),
  'Calculator logic should load before the admin UI'
);
assert.match(adminApp, /name: 'numerology-calculator'/);
assert.match(adminApp, /window\.print\(\)/);
assert.match(adminCss, /@media print/);
assert.match(adminCss, /body\.is-printing-numerology/);

console.log('Admin numerology calculator tests: OK');
