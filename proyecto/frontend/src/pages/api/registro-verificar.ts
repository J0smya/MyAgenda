export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { enviarOtpEmail } from '../../lib/email';

const SECRET = process.env.SESSION_SECRET ?? 'myagenda-dev-secret-2026';

// Token que lleva los datos de registro + OTP (10 min)
function crearRegToken(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verificarRegToken(token: string): any | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (!data.otp || !data.exp) return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Formato de solicitud inválido' }, 400); }

  const { accion, nombre, email, contrasena, telefono, regToken, codigo } = body;

  // ── 1. ENVIAR OTP (antes de crear la cuenta) ─────────────────────────────
  if (accion === 'enviar_otp') {
    if (!nombre?.trim() || !email?.trim() || !contrasena) {
      return json({ error: 'Faltan datos de registro' }, 400);
    }

    // Verificar que el correo no esté ya registrado
    try {
      const existe = await pool.query(
        'SELECT id_usuario FROM public.usuario WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
      );
      if (existe.rows.length > 0) {
        return json({ error: 'Este correo ya está registrado. Inicia sesión.' }, 409);
      }
    } catch (e: any) {
      console.error('[registro-verificar] Error BD:', e.message);
      return json({ error: 'Error al verificar la cuenta. Intenta de nuevo.' }, 500);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(contrasena, 10);

    const token = crearRegToken({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      contrasena: hash,
      telefono: telefono?.trim() || '',
      otp,
      exp: Date.now() + 3 * 60 * 1000,
    });

    try { await enviarOtpEmail(email.trim(), otp); }
    catch (e: any) { console.error('[registro] Error email OTP:', e.message); }

    return json({ ok: true, regToken: token });
  }

  // ── 2. VERIFICAR OTP Y CREAR CUENTA ──────────────────────────────────────
  if (accion === 'verificar_y_crear') {
    if (!regToken) return json({ error: 'Token de verificación faltante' }, 400);
    if (!codigo?.trim() || codigo.trim().length !== 6) {
      return json({ error: 'El código debe tener 6 dígitos' }, 400);
    }

    const datos = verificarRegToken(regToken);
    if (!datos) return json({ error: 'El código expiró. Vuelve a completar el formulario.' }, 400);
    if (datos.otp !== codigo.trim()) return json({ error: 'Código incorrecto. Verifica e intenta de nuevo.' }, 400);

    // Crear cuenta
    try {
      const existeDoble = await pool.query(
        'SELECT id_usuario FROM public.usuario WHERE LOWER(email) = LOWER($1)',
        [datos.email]
      );
      if (existeDoble.rows.length > 0) {
        return json({ error: 'Este correo ya está registrado.' }, 409);
      }

      await pool.query(
        `INSERT INTO public.usuario (nombre, email, contrasena, telefono, fecha_creacion)
         VALUES ($1, $2, $3, $4, NOW())`,
        [datos.nombre, datos.email, datos.contrasena, datos.telefono || null]
      );

      return json({ ok: true });
    } catch (e: any) {
      console.error('[registro-verificar] Error creando usuario:', e.message);
      return json({ error: `Error al crear la cuenta: ${e.message}` }, 500);
    }
  }

  return json({ error: 'Acción no reconocida' }, 400);
};
