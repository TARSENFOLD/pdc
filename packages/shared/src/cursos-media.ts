import { z } from 'zod';

export const CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH = 3;
export const CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH = 160;

export const CursoItemImagemSchema = z.object({
  url: z.string().url('Adiciona um endereço válido para a imagem.'),
  alt: z.string().trim()
    .min(
      CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH,
      `Adiciona uma descrição acessível com pelo menos ${String(CURSO_ITEM_IMAGEM_ALT_MIN_LENGTH)} caracteres.`,
    )
    .max(
      CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH,
      `A descrição acessível pode ter no máximo ${String(CURSO_ITEM_IMAGEM_ALT_MAX_LENGTH)} caracteres.`,
    ),
});

export const CursoItemImagensSchema = z.array(CursoItemImagemSchema);

export type CursoItemImagem = z.infer<typeof CursoItemImagemSchema>;
