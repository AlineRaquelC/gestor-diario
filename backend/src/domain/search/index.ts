/** Literal substring search; accents are preserved, letter case is ignored. */
export const normalizeSearch = (value: string) => value.trim().toLowerCase();
export const containsSearch = (value: string | null | undefined, query: string) =>
  (value ?? '').toLowerCase().includes(normalizeSearch(query));
