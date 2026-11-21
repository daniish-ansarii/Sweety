const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
function validateReading({ date, slot, value }) {
  if (value === '' || value === undefined || value === null) return 'Please enter a glucose value.';
  if (!Number.isInteger(Number(value)) || Number(value) < 40 || Number(value) > 600) return 'Value must be between 40 and 600 mg/dl.';
  if (!SLOTS.includes(slot)) return 'Please choose a valid time slot.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return 'Please choose a valid date.';
  if (date > new Date().toISOString().slice(0, 10)) return 'Date cannot be in the future.';
  return null;
}
module.exports = { SLOTS, validateReading };
