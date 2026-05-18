import type { Pagination } from '@pdc/shared';

interface StrapiPaginatedPayload<T> {
  data: T[];
  meta: {
    pagination: Pagination;
  };
}

export function toPaginatedResponse<T>(response: StrapiPaginatedPayload<T>): {
  data: T[];
  pagination: Pagination;
} {
  return {
    data: response.data,
    pagination: response.meta.pagination,
  };
}
