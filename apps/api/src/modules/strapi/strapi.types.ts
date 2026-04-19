export interface StrapiEntity {
  id: string;
  documentId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  [key: string]: unknown;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
}

export interface StrapiConversa extends StrapiEntity {
  participant1Id: string;
  participant2Id: string;
}

export interface StrapiPerfil extends StrapiEntity {
  nome: string;
  userId: string;
  alunoId?: string;
  email?: string;
}

export interface StrapiMentoria extends StrapiEntity {
  titulo: string;
  alunoId: string;
}

export interface StrapiRating extends StrapiEntity {
  nota: number;
}
