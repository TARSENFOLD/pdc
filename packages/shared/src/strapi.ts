export interface StrapiError {
  status: number;
  name: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Interface para respostas de listas do Strapi (Normalizada/Flat)
 * O campo 'data' contém directamente os objectos com 'id' incluído.
 */
export interface StrapiListResponse<T> {
  data: (T & { id: number | string })[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
  error?: StrapiError;
}

/**
 * Interface para respostas únicas do Strapi (Normalizada/Flat)
 */
export interface StrapiSingleResponse<T> {
  data: T & { id: number | string };
  meta: Record<string, unknown>;
  error?: StrapiError;
}
