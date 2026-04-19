import { Resend } from 'resend';
import { env } from '../../lib/env.js';
import pino from 'pino';

const log = pino({ name: 'mail-service' });
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const mailService = {
  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!resend) {
      log.warn({ to, subject }, 'Resend API Key não configurada. Email não enviado.');
      return;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'PDC <no-reply@pdc.ao>', // TODO: Update to real domain once verified
        to,
        subject,
        html,
      });

      if (error) {
        log.error({ error, to }, 'Erro ao enviar email via Resend');
        throw error;
      }

      return data;
    } catch (err) {
      log.error({ err, to }, 'Falha catastrófica no envio de email');
      throw err;
    }
  }
};
