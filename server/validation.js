const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
function localDate(timeZone = 'UTC', now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    const part = type => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return localDate('UTC', now);
  }
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function previousMonthRange(date) {
  const [year, month] = date.split('-').map(Number);
  const previousEnd = new Date(Date.UTC(year, month - 1, 0));
  const previousYear = previousEnd.getUTCFullYear();
  const previousMonth = String(previousEnd.getUTCMonth() + 1).padStart(2, '0');
  const previousStart = `${previousYear}-${previousMonth}-01`;
  const previousLastDay = String(previousEnd.getUTCDate()).padStart(2, '0');
  return { start: previousStart, end: `${previousYear}-${previousMonth}-${previousLastDay}` };
}

function validateReading({ date, slot, value }, timeZone = 'UTC', now = new Date()) {
  if (value === '' || value === undefined || value === null) return 'Please enter a glucose value.';
  if (!Number.isInteger(Number(value)) || Number(value) < 40 || Number(value) > 600) return 'Value must be between 40 and 600 mg/dl.';
  if (!SLOTS.includes(slot)) return 'Please choose a valid time slot.';
  if (!isValidDate(date)) return 'Please choose a valid date.';
  if (date > localDate(timeZone, now)) return 'Date cannot be in the future.';
  return null;
}
module.exports = { SLOTS, isValidDate, localDate, previousMonthRange, validateReading };
