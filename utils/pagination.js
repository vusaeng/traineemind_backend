// src/utils/pagination.js

/**
 * Build pagination parameters from query string.
 * @param {number|string} pageQuery - page number from req.query.page
 * @param {number|string} limitQuery - limit number from req.query.limit
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function buildPagination(pageQuery, limitQuery) {
  const page = Math.max(parseInt(pageQuery, 10) || 1, 1);
  const limit = Math.max(parseInt(limitQuery, 10) || 10, 1);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
