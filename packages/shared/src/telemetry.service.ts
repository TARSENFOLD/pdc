import { TelemetriaTipoSchema } from './index.js';

export const TelemetryService = {
    validateType(type: string): void {
    TelemetriaTipoSchema.parse(type);
  }
}
