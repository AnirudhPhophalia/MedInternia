export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function parsePagination(query: Record<string, any>): PaginationParams {
  const rawPage = query.page;
  const rawLimit = query.limit;

  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  if (rawPage !== undefined) {
    const parsed = parseInt(String(rawPage), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      page = parsed;
    }
  }

  if (rawLimit !== undefined) {
    const parsed = parseInt(String(rawLimit), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      limit = Math.min(parsed, MAX_LIMIT);
    }
  }

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
