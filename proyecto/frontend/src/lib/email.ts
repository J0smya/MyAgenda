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
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[DEV] OTP para verificación de email ${email}: ${codigo}`);
    return;
  }

  const transporter = crearTransporter();

  await transporter.sendMail({
    from: `"My Agenda" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Código de verificación — My Agenda',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
        <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:16px;">Código de verificación</h2>
        <div style="background:#f0f9ff;border:2px solid #bae6fd;border-radius:14px;padding:24px;text-align:center;margin:20px 0;">
          <span style="font-size:40px;font-weight:900;color:#0284c7;letter-spacing:12px;font-family:monospace;">${codigo}</span>
        </div>
        <p style="font-size:13px;color:#94a3b8;">Expira en 10 minutos.</p>
      </div>
    `,
  });
}

// ── Notificaciones de tareas (Gmail SMTP) ────────────────────────────────────

export async function enviarNotificacionCreacion(
  email: string,
  tarea: { titulo: string; fecha_inicio?: string | null; hora_inicio?: string | null; prioridad?: string | null }
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[DEV] SMTP no configurado. Notificación creación no enviada para:', tarea.titulo);
    return;
  }
  const fecha    = tarea.fecha_inicio ? tarea.fecha_inicio.toString().slice(0, 10) : 'Sin fecha';
  const hora     = tarea.hora_inicio  ? tarea.hora_inicio.toString().slice(0, 5)   : 'Sin hora';
  const prioridad = tarea.prioridad ?? 'media';

  const transporter = crearTransporter();
  await transporter.sendMail({
    from: `"My Agenda" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Nueva tarea: ${tarea.titulo}`,
    html: `
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
    `,
  });
}

export async function enviarRecordatorioVencimiento(
  email: string,
  tarea: { titulo: string; fecha_inicio?: string | null; hora_inicio?: string | null; prioridad?: string | null }
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[DEV] SMTP no configurado. Recordatorio no enviado para:', tarea.titulo);
    return;
  }
  const hora      = tarea.hora_inicio  ? tarea.hora_inicio.toString().slice(0, 5) : 'Sin hora definida';
  const prioridad = tarea.prioridad ?? 'media';

  const transporter = crearTransporter();
  await transporter.sendMail({
    from: `"My Agenda" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Recordatorio: ${tarea.titulo}`,
    html: `
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
    `,
  });
}

export async function enviarSmsTelefono(
  telefono: string,
  codigo: string
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn(`[DEV] SMS OTP para ${telefono}: ${codigo} (Twilio no configurado)`);
    return;
  }

  // Twilio REST API — no importamos el SDK para no añadir dependencia
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To:   telefono,
    From: from,
    Body: `Tu código de verificación de My Agenda es: ${codigo}. Válido por 10 minutos.`,
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error('Twilio SMS error:', err);
  }
}
