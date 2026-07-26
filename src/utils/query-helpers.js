/**
 * Parses standard `page` / `pageSize` query params with sane defaults + caps.
 */
export function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

/**
 * Wraps a list response in the project-wide shape: { data, total, page, pageSize }
 */
export function buildListResponse({ data, total, page, pageSize }) {
  return { data, total, page, pageSize };
}
