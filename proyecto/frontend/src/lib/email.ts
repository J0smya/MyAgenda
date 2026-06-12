import nodemailer from 'nodemailer';

function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

export async function enviarOtpTelefono(
  email: string,
  telefonoPendiente: string,
  codigo: string
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[DEV] OTP para cambio de teléfono a ${telefonoPendiente}: ${codigo}`);
    return;
  }

  const transporter = crearTransporter();

  await transporter.sendMail({
    from: `"My Agenda" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verificación de número de teléfono — My Agenda',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:14px;background:#f0f9ff;margin-bottom:16px;">
            <span style="font-size:28px;">📱</span>
          </div>
          <h2 style="margin:0;font-size:22px;font-weight:800;color:#0f172a;">Verificación de teléfono</h2>
          <p style="margin:8px 0 0;font-size:14px;color:#64748b;">My Agenda necesita confirmar tu nuevo número</p>
        </div>

        <p style="font-size:15px;color:#374151;margin-bottom:8px;">
          Has solicitado cambiar tu número de teléfono a:
        </p>
        <p style="font-size:16px;font-weight:700;color:#0284c7;margin:0 0 24px;">${telefonoPendiente}</p>

        <p style="font-size:14px;color:#64748b;margin-bottom:12px;">Tu código de verificación es:</p>
        <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:900;color:#0284c7;letter-spacing:12px;font-family:monospace;">${codigo}</span>
        </div>

        <div style="background:#fef9ec;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#92400e;">
            ⏱️ Este código expira en <strong>10 minutos</strong>. Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>

        <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
          My Agenda — Tu agenda personal inteligente
        </p>
      </div>
    `,
  });
}

export async function enviarOtpEmail(
  email: string,
  codigo: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[DEV] RESEND_API_KEY no configurada. OTP para ${email}: ${codigo}`);
    return;
  }

  await enviarConResend(
    email,
    'Código de verificación — My Agenda',
    `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;max-width:520px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px 32px 28px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:14px;padding:12px 16px;margin-bottom:14px;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">My Agenda</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.80);">Código de verificación</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 6px;font-size:15px;color:#374151;font-weight:600;">Hola,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
              Usa el siguiente código para verificar tu identidad en <strong style="color:#0f172a;">My Agenda</strong>.
              Si no fuiste tú, ignora este mensaje.
            </p>

            <!-- OTP box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center" style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:16px;padding:28px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1.5px;">Tu código</p>
                  <span style="font-size:46px;font-weight:900;color:#0c4a6e;letter-spacing:14px;font-family:'Courier New',monospace;">${codigo}</span>
                </td>
              </tr>
            </table>

            <!-- Warning -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;">
                  <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5;">
                    <strong>Expira en 10 minutos.</strong> Nunca compartas este código con nadie.
                    My Agenda nunca te pedirá tu código por otro canal.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
              Si no solicitaste este código, puedes ignorar este correo de forma segura.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">My Agenda &mdash; Tu agenda personal inteligente</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
  );
}

// ── Notificaciones de tareas (Resend) ────────────────────────────────────────

async function enviarConResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[DEV] RESEND_API_KEY no configurada. Email no enviado:', subject);
    return;
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'My Agenda <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!resp.ok) console.error('[Resend] Error:', await resp.text());
}

export async function enviarNotificacionCreacion(
  email: string,
  tarea: { titulo: string; fecha_inicio?: string | null; hora_inicio?: string | null; prioridad?: string | null }
): Promise<void> {
  const fecha     = tarea.fecha_inicio ? tarea.fecha_inicio.toString().slice(0, 10) : 'Sin fecha';
  const hora      = tarea.hora_inicio  ? tarea.hora_inicio.toString().slice(0, 5)   : 'Sin hora';
  const prioridad = tarea.prioridad ?? 'media';

  await enviarConResend(email, `Nueva tarea: ${tarea.titulo}`, `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <h2 style="color:#0f172a;margin:0 0 6px;">Tarea creada en My Agenda</h2>
      <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Se registró una nueva tarea en tu agenda.</p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#0f172a;margin:0 0 14px;font-size:18px;">${tarea.titulo}</h3>
        <p style="margin:6px 0;color:#64748b;font-size:14px;">📅 Fecha: <strong style="color:#0f172a;">${fecha}</strong></p>
        <p style="margin:6px 0;color:#64748b;font-size:14px;">🕐 Hora: <strong style="color:#0f172a;">${hora}</strong></p>
        <p style="margin:6px 0;color:#64748b;font-size:14px;">⚡ Prioridad: <strong style="color:#0f172a;">${prioridad}</strong></p>
      </div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">My Agenda — Tu agenda personal inteligente</p>
    </div>
  `);
}

export async function enviarRecordatorioVencimiento(
  email: string,
  tarea: { titulo: string; fecha_inicio?: string | null; hora_inicio?: string | null; prioridad?: string | null }
): Promise<void> {
  const hora      = tarea.hora_inicio  ? tarea.hora_inicio.toString().slice(0, 5) : 'Sin hora definida';
  const prioridad = tarea.prioridad ?? 'media';

  await enviarConResend(email, `Recordatorio: ${tarea.titulo}`, `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <h2 style="color:#0f172a;margin:0 0 6px;">Recordatorio de tarea</h2>
      <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Tienes una tarea programada para hoy en My Agenda.</p>
      <div style="background:#fef9ec;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#0f172a;margin:0 0 14px;font-size:18px;">${tarea.titulo}</h3>
        <p style="margin:6px 0;color:#64748b;font-size:14px;">🕐 Hora: <strong style="color:#0f172a;">${hora}</strong></p>
        <p style="margin:6px 0;color:#64748b;font-size:14px;">⚡ Prioridad: <strong style="color:#0f172a;">${prioridad}</strong></p>
      </div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">My Agenda — Tu agenda personal inteligente</p>
    </div>
  `);
}

// ── WhatsApp via Green-API (plan gratuito — green-api.com) ───────────────────
// Registro gratuito en https://green-api.com → crear instancia → escanear QR
// Variables: GREEN_API_INSTANCE_ID y GREEN_API_TOKEN

async function enviarWhatsAppGreenApi(telefono: string, mensaje: string): Promise<void> {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token      = process.env.GREEN_API_TOKEN;

  if (!instanceId || !token) {
    console.warn(`[DEV] WhatsApp OTP para ${telefono}: ${mensaje} (GREEN_API no configurado)`);
    return;
  }

  // chatId: solo dígitos + "@c.us" (ej: "573016445715@c.us")
  const chatId = telefono.replace(/\D/g, '') + '@c.us';

  // GREEN_API_HOST puede configurarse explícitamente (ej: https://7103.api.green-api.com)
  // Si no está definido, se deriva de los primeros 4 dígitos del instanceId
  const host = process.env.GREEN_API_HOST
    ?? `https://${instanceId.slice(0, 4)}.api.green-api.com`;
  const url = `${host}/waInstance${instanceId}/sendMessage/${token}`;

  console.log(`[Green-API] Enviando a ${chatId} via ${host}`);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message: mensaje }),
    });
  } catch (e: any) {
    console.error('[Green-API] Error de red:', e.message);
    throw new Error('No se pudo conectar con Green-API. Verifica que la instancia esté activa.');
  }

  const respText = await resp.text();
  if (!resp.ok) {
    console.error(`[Green-API] HTTP ${resp.status}: ${respText}`);
    throw new Error(`Green-API respondió con error ${resp.status}. Verifica que la instancia esté autorizada (QR escaneado).`);
  }
  console.log('[Green-API] Enviado correctamente:', respText);
}

export async function enviarSmsTelefono(
  telefono: string,
  codigo: string
): Promise<void> {
  // SMS (Twilio) eliminado — redirige el canal "sms" a WhatsApp gratuito
  await enviarOtpWhatsApp(telefono, codigo);
}

export async function enviarOtpWhatsApp(
  telefono: string,
  codigo: string
): Promise<void> {
  await enviarWhatsAppGreenApi(
    telefono,
    `*My Agenda* — Código de verificación\n\nTu código es: *${codigo}*\n\nVálido por 10 minutos. No lo compartas con nadie.`
  );
}

export async function enviarRecordatorioWhatsApp(
  telefono: string,
  tarea: { titulo: string; hora_inicio?: string | null; prioridad?: string | null }
): Promise<void> {
  const hora      = tarea.hora_inicio ? tarea.hora_inicio.toString().slice(0, 5) : 'sin hora';
  const prioridad = tarea.prioridad ?? 'media';
  const nivel     = prioridad === 'alta' ? 'ALTA' : prioridad === 'media' ? 'Media' : 'Baja';

  await enviarWhatsAppGreenApi(
    telefono,
    `*My Agenda* — Recordatorio\n\n*${tarea.titulo}*\nHora: ${hora}\nPrioridad: ${nivel}\n\nTienes esta tarea programada para hoy.`
  );
}

export async function enviarNotificacionCreacionWhatsApp(
  telefono: string,
  tarea: { titulo: string; fecha_inicio?: string | null; hora_inicio?: string | null; prioridad?: string | null }
): Promise<void> {
  const fecha     = tarea.fecha_inicio ? tarea.fecha_inicio.toString().slice(0, 10) : 'sin fecha';
  const hora      = tarea.hora_inicio  ? tarea.hora_inicio.toString().slice(0, 5)   : 'sin hora';
  const prioridad = tarea.prioridad ?? 'media';

  await enviarWhatsAppGreenApi(
    telefono,
    `*My Agenda* — Tarea creada\n\n*${tarea.titulo}*\nFecha: ${fecha}   Hora: ${hora}\nPrioridad: ${prioridad}`
  );
}
