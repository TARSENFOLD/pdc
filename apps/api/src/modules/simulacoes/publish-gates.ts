import { Features } from '@pdc/shared';
import pino from 'pino';
import { featureFlagService } from '../feature-flags/feature-flags.service.js';

const log = pino({ name: 'simulacoes:publish-gates' });

const DISABLED_SIM_TIPO_RESPONSE = {
  error: 'Publicação desta simulação desabilitada',
  code: 'SIM_TIPO_DISABLED',
} as const;

const SIM_TIPO_FLAG_BY_TIPO = {
  2: 'SIM_TIPO_2_PUBLISH_ENABLED',
  3: 'SIM_TIPO_3_PUBLISH_ENABLED',
} as const;

type GatedSimTipo = keyof typeof SIM_TIPO_FLAG_BY_TIPO;

function isGatedSimTipo(tipo: number): tipo is GatedSimTipo {
  return tipo === 2 || tipo === 3;
}

function isRegisteredFlag(flag: string): flag is keyof typeof Features {
  return flag in Features;
}

export async function canPublishSimTipo(tipo: number): Promise<boolean> {
  if (!isGatedSimTipo(tipo)) return true;

  const flag = SIM_TIPO_FLAG_BY_TIPO[tipo];
  if (!isRegisteredFlag(flag)) return false;

  try {
    const effectiveFlags = await featureFlagService.getEffectiveFlags(undefined);
    return effectiveFlags[flag] === true;
  } catch (err) {
    log.error({ err, flag, tipo }, 'Falha ao resolver flag de simulação — fail-closed');
    return false;
  }
}

export { DISABLED_SIM_TIPO_RESPONSE };
