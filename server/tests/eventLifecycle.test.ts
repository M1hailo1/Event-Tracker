import { activeEventsWhere, endedEventsWhere, getEventState, validUpdatedDates } from "../src/utils/eventLifecycle";

const start = new Date('2030-06-14T16:00:00Z');
const end = new Date('2030-06-14T18:00:00Z');
it('changes state at the exact start and end boundaries', () => {
  expect(getEventState({ date: start, endDate: end }, new Date(start.getTime() - 1))).toBe('UPCOMING');
  expect(getEventState({ date: start, endDate: end }, start)).toBe('ONGOING');
  expect(getEventState({ date: start, endDate: end }, new Date(end.getTime() - 1))).toBe('ONGOING');
  expect(getEventState({ date: start, endDate: end }, end)).toBe('ENDED');
});
it('treats an event without an end as ended at its start, matching rating eligibility', () => {
  expect(getEventState({ date: start, endDate: null }, new Date(start.getTime() - 1))).toBe('UPCOMING');
  expect(getEventState({ date: start, endDate: null }, start)).toBe('ENDED');
});
it('uses complementary active/history end-time filters', () => {
  expect(activeEventsWhere(start)).toEqual({ OR: [{ endDate: { gt: start } }, { endDate: null, date: { gt: start } }] });
  expect(endedEventsWhere(start)).toEqual({ OR: [{ endDate: { lte: start } }, { endDate: null, date: { lte: start } }] });
});
it('validates edits against merged dates, preserving omissions and allowing explicit removal', () => {
  const stored = { date: start, endDate: end };
  expect(validUpdatedDates(stored, {})).toBe(true);
  expect(validUpdatedDates(stored, { date: end.toISOString() })).toBe(false);
  expect(validUpdatedDates(stored, { endDate: start.toISOString() })).toBe(false);
  expect(validUpdatedDates(stored, { date: '2030-06-15T16:00:00.000Z', endDate: '2030-06-15T18:00:00.000Z' })).toBe(true);
  expect(validUpdatedDates(stored, { date: '2030-06-15T16:00:00.000Z', endDate: null })).toBe(true);
});
