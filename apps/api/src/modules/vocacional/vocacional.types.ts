export interface Recomendacao {
  id: string;
  titulo: string;
  tipo: 'curso' | 'simulacao' | 'experiencia';
  matchPercentagem: number;
  motivo: string;
}
