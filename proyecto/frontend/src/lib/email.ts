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
