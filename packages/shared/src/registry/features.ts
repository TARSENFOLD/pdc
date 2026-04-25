import { z } from 'zod';

export const FeatureStatusSchema = z.enum([
  'STABLE',    // Funcionalidade base, sempre ON por omissão, raramente sujeita a flag
  'BETA',      // Funcionalidade em teste, default OFF, pode ser ligada via Strapi
  'ALPHA',     // Funcionalidade experimental, default OFF, uso restrito
  'ROLLOUT',   // Em lançamento gradual (ex: 50% dos users)
  'HIDDEN',    // Funcionalidade arquivada ou secreta, NUNCA enviada no /bootstrap (hard OFF)
]);

export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const FeatureRegistrySchema = z.record(z.string(), FeatureStatusSchema);

// Registo Estático Híbrido: Define O QUE EXISTE. 
// O Strapi apenas controla o estado ON/OFF em runtime.
export const Features = {
  'DISCUSSIONS_ENABLED': 'STABLE',
  'PROFILE_V2_PUBLIC': 'ROLLOUT',
  'REPUTATION_VISIBLE': 'BETA',
  'AUTO_ACHIEVEMENTS': 'BETA',
  'TINA_GLOBAL_ASSISTANT': 'BETA',
  'SIM_TIPO_3': 'ALPHA',
  'MENSAGENS_INBOX': 'HIDDEN', // Fachada, não expor no bootstrap
  
  // Wave 4 - Elite Hubs (Sovereign Infrastructure)
  'HUB_LEARN': 'STABLE',
  'HUB_EXPLORE': 'STABLE',
  'HUB_FUTURE': 'STABLE',
  'HUB_COMMUNITY': 'STABLE',
  'HUB_MENTOR': 'STABLE',
  'HUB_INSTITUTION': 'STABLE',
} as const;

export type FeatureKey = keyof typeof Features;
