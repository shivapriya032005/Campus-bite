// Date-range helpers for the order filters.
//
// <input type="date"> yields "YYYY-MM-DD" in the user's *local* calendar. The API interprets bare
// dates as UTC days, so we send explicit UTC instants for the start/end of the local day instead.
// That keeps "today" meaning the user's today regardless of their timezone offset.

function parseLocalDate(value) {
  const [y, m, d] = value.split('-').map(Number)
  return { y, m, d }
}

export function startOfLocalDayISO(value) {
  const { y, m, d } = parseLocalDate(value)
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
}

export function endOfLocalDayISO(value) {
  const { y, m, d } = parseLocalDate(value)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

/** Build `{ date_from, date_to }` query params from two date-input values (either may be empty). */
export function dateRangeParams(from, to) {
  const params = {}
  if (from) params.date_from = startOfLocalDayISO(from)
  if (to) params.date_to = endOfLocalDayISO(to)
  return params
}

/** True when both dates are set and the range is inverted (the API would answer 422). */
export function isInvertedRange(from, to) {
  return Boolean(from && to && from > to)
}
