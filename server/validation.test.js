const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReading } = require('./validation');
test('reading validation requires an integer value in range', () => {
  assert.equal(validateReading({ date: '2026-11-20', slot: 'morning', value: '' }), 'Please enter a glucose value.');
  assert.equal(validateReading({ date: '2026-11-20', slot: 'morning', value: 39 }), 'Value must be between 40 and 600 mg/dl.');
  assert.equal(validateReading({ date: '2026-11-20', slot: 'morning', value: 600 }), null);
});
test('reading validation rejects unknown slots and future dates', () => {
  assert.equal(validateReading({ date: '2026-11-20', slot: 'midnight', value: 100 }), 'Please choose a valid time slot.');
  assert.equal(validateReading({ date: '2999-01-01', slot: 'morning', value: 100 }), 'Date cannot be in the future.');
});
