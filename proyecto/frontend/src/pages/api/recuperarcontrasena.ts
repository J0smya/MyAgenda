export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { enviarOtpEmail } from '../../lib/email';

// ── Clave de firma (misma que sesion.ts) ─────────────────────────────────────
const SECRET = process.env.SESSION_SECRET ?? 'myagenda-dev-secret-2026';

// ── Token OTP: {idUsuario, otp, exp} firmado con HMAC ────────────────────────
// No necesita tabla en BD — el OTP viaja dentro del token cifrado.
function crearOtpToken(idUsuario: string, otp: string): string {
  const payload = Buffer.from(
    JSON.stringify({ id_usuario: idUsuario, otp, exp: Date.now() + 3 * 60 * 1000 })
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verificarOtpToken(token: string): { id_usuario: string; otp: string } | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload  = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.otp || !data.id_usuario) return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Token de restablecimiento: {idUsuario, exp} para cambiar la clave ────────
function crearResetToken(idUsuario: string): string {
  const payload = Buffer.from(
    JSON.stringify({ id_usuario: idUsuario, exp: Date.now() + 15 * 60 * 1000 })
  ).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verificarResetToken(token: string): { id_usuario: string } | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload  = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.id_usuario) return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function enmascararEmail(email: string): string {
  return email.replace(/^(.{2})(.+?)(@.+)$/, (_, a, b, c) =>
    a + '*'.repeat(Math.min(b.length, 4)) + c
  );
}

function enmascararTelefono(tel: string): string {
  const clean = tel.replace(/\D/g, '');
  return `***${clean.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Formato de solicitud inválido' }, 400);
  }

  const { accion, metodo, email, telefono, codigo, otpToken, nuevaContrasena, resetToken } = body;

  // ── 1. ENVIAR CÓDIGO ──────────────────────────────────────────────────────
  if (accion === 'enviar_codigo') {
    let idUsuario: string;
    let emailUsuario: string;
    let telefonoUsuario: string | null = null;
    let destino: string;

    try {
      if (metodo === 'email') {
        if (!email?.trim()) return json({ error: 'Ingresa tu correo electrónico' }, 400);

        const res = await pool.query(
          `SELECT id_usuario, email FROM public.usuario WHERE LOWER(email) = LOWER($1)`,
          [email.trim()]
        );
        if (res.rows.length === 0)
          return json({ error: 'Ese correo no está registrado en My Agenda' }, 404);

        idUsuario    = res.rows[0].id_usuario;
        emailUsuario = res.rows[0].email;
        destino      = enmascararEmail(emailUsuario);

      } else if (metodo === 'sms' || metodo === 'whatsapp') {
        if (!telefono?.trim()) return json({ error: 'Ingresa tu número de teléfono' }, 400);

        const res = await pool.query(
          `SELECT id_usuario, email, telefono FROM public.usuario WHERE telefono = $1`,
          [telefono.trim()]
        );
        if (res.rows.length === 0)
          return json({ error: 'Ese número no está registrado en My Agenda' }, 404);

        idUsuario       = res.rows[0].id_usuario;
        emailUsuario    = res.rows[0].email;
        telefonoUsuario = res.rows[0].telefono;
        destino         = enmascararTelefono(telefonoUsuario!);

      } else {
        return json({ error: 'Método inválido. Elige "email", "sms" o "whatsapp".' }, 400);
      }
    } catch (e: any) {
      console.error('[recuperar] Error buscando usuario:', e.message);
      return json({ error: 'Error al buscar la cuenta. Intenta de nuevo.' }, 500);
    }

    // Generar OTP y empaquetarlo en un token firmado (sin necesitar tabla en BD)
    const otp      = Math.floor(100000 + Math.random() * 900000).toString();
    const newToken = crearOtpToken(idUsuario, otp);

    try { await enviarOtpEmail(emailUsuario, otp); }
    catch (e: any) { console.error('Error enviando email OTP:', e.message); }

    return json({ ok: true, otpToken: newToken, destino });
  }

  // ── 2. VERIFICAR CÓDIGO ───────────────────────────────────────────────────
  if (accion === 'verificar_codigo') {
    if (!otpToken) return json({ error: 'Token de verificación faltante' }, 400);
    if (!codigo?.trim() || codigo.trim().length !== 6)
      return json({ error: 'El código debe tener 6 dígitos' }, 400);

    const datos = verificarOtpToken(otpToken);

    if (!datos)
      return json({ error: 'El código ha expirado. Solicita uno nuevo.' }, 400);

    if (datos.otp !== codigo.trim())
      return json({ error: 'Código incorrecto. Verifica e intenta de nuevo.' }, 400);

    // OTP correcto → emitir reset token (15 min para cambiar la clave)
    const newResetToken = crearResetToken(datos.id_usuario);
    return json({ ok: true, resetToken: newResetToken });
  }

  // ── 3. ACTUALIZAR CONTRASEÑA ──────────────────────────────────────────────
  if (accion === 'actualizar_contrasena') {
    if (!resetToken)
      return json({ error: 'Token de restablecimiento faltante. Inicia el proceso de nuevo.' }, 400);
    if (!nuevaContrasena || nuevaContrasena.length < 8)
      return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);

    const datos = verificarResetToken(resetToken);
    if (!datos)
      return json({ error: 'El enlace de restablecimiento expiró. Inicia el proceso de nuevo.' }, 401);

    try {
      const hash   = await bcrypt.hash(nuevaContrasena, 10);
      const result = await pool.query(
        'UPDATE public.usuario SET contrasena = $1 WHERE id_usuario = $2',
        [hash, datos.id_usuario]
      );
      if ((result.rowCount ?? 0) === 0)
        return json({ error: 'No se encontró la cuenta. Contacta soporte.' }, 404);

      return json({ ok: true });
    } catch (e: any) {
      console.error('[recuperar] Error actualizando contraseña:', e.message);
      return json({ error: 'Error al guardar la contraseña. Intenta de nuevo.' }, 500);
    }
  }

  return json({ error: 'Acción no reconocida' }, 400);
};
