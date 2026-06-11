export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { obtenerTokenDeCookie, obtenerSesion } from '../../lib/sesion';
import { enviarOtpTelefono, enviarSmsTelefono } from '../../lib/email';

async function asegurarTablaOtp() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.verificaciones_otp (
      id          SERIAL PRIMARY KEY,
      id_usuario  UUID        NOT NULL,
      tipo        VARCHAR(50) NOT NULL,
      dato_nuevo  VARCHAR(200),
      codigo      VARCHAR(6)  NOT NULL,
      expires_at  TIMESTAMP   NOT NULL,
      usado       BOOLEAN     DEFAULT FALSE,
      created_at  TIMESTAMP   DEFAULT NOW()
    )
  `);
}

// POST /api/config-telefono
// body: { accion: 'solicitar', telefono } | { accion: 'verificar', codigo, telefono }
export const POST: APIRoute = async ({ request }) => {
  const token = obtenerTokenDeCookie(request.headers.get('cookie'));
  if (!token) return json({ ok: false, error: 'No autorizado' }, 401);

  const sesion = await obtenerSesion(token);
  if (!sesion) return json({ ok: false, error: 'Sesión expirada' }, 401);

  let body: any;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: 'Cuerpo inválido' }, 400); }

  await asegurarTablaOtp();

  // ── SOLICITAR CAMBIO ──────────────────────────────────────────
  if (body.accion === 'solicitar') {
    const telefono = body.telefono?.toString().trim();
    if (!telefono || telefono.length < 7) {
      return json({ ok: false, error: 'Número de teléfono inválido' }, 400);
    }

    // Verificar que el número no esté en uso por otro usuario
    const existeRes = await pool.query(
      'SELECT id_usuario FROM public.usuario WHERE telefono = $1 AND id_usuario != $2',
      [telefono, sesion.id_usuario]
    );
    if ((existeRes.rowCount ?? 0) > 0) {
      return json({ ok: false, error: 'Este número ya está registrado por otra cuenta' }, 409);
    }

    // Generar OTP de 6 dígitos
    const codigo    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Invalidar OTPs anteriores del mismo usuario y tipo
    await pool.query(
      `UPDATE public.verificaciones_otp SET usado = TRUE
       WHERE id_usuario = $1 AND tipo = 'cambio_telefono' AND usado = FALSE`,
      [sesion.id_usuario]
    );

    // Guardar nuevo OTP
    await pool.query(
      `INSERT INTO public.verificaciones_otp (id_usuario, tipo, dato_nuevo, codigo, expires_at)
       VALUES ($1, 'cambio_telefono', $2, $3, $4)`,
      [sesion.id_usuario, telefono, codigo, expiresAt]
    );

    // Enviar por email (siempre) y SMS (si Twilio configurado)
    try {
      await enviarOtpTelefono(sesion.email, telefono, codigo);
    } catch (emailErr: any) {
      console.error('Error enviando email OTP:', emailErr.message);
    }
    try {
      await enviarSmsTelefono(telefono, codigo);
    } catch (smsErr: any) {
      console.error('Error enviando SMS OTP:', smsErr.message);
    }

    return json({ ok: true, mensaje: 'Código enviado a tu email' });
  }

  // ── VERIFICAR CÓDIGO ─────────────────────────────────────────
  if (body.accion === 'verificar') {
    const codigo   = body.codigo?.toString().trim();
    const telefono = body.telefono?.toString().trim();

    if (!codigo || !telefono) {
      return json({ ok: false, error: 'Datos incompletos' }, 400);
    }

    const otpRes = await pool.query(
      `SELECT id, expires_at, usado, dato_nuevo
       FROM   public.verificaciones_otp
       WHERE  id_usuario = $1
         AND  tipo = 'cambio_telefono'
         AND  codigo = $2
         AND  dato_nuevo = $3
       ORDER  BY created_at DESC
       LIMIT  1`,
      [sesion.id_usuario, codigo, telefono]
    );

    if (otpRes.rows.length === 0) {
      return json({ ok: false, error: 'Código incorrecto' }, 400);
    }

    const otp = otpRes.rows[0];

    if (otp.usado) {
      return json({ ok: false, error: 'Este código ya fue utilizado' }, 400);
    }

    if (new Date() > new Date(otp.expires_at)) {
      return json({ ok: false, error: 'El código ha expirado. Solicita uno nuevo.' }, 400);
    }

    // Marcar OTP como usado
    await pool.query(
      'UPDATE public.verificaciones_otp SET usado = TRUE WHERE id = $1',
      [otp.id]
    );

    // Actualizar teléfono del usuario
    await pool.query(
      'UPDATE public.usuario SET telefono = $1 WHERE id_usuario = $2',
      [telefono, sesion.id_usuario]
    );

    return json({ ok: true, mensaje: 'Número de teléfono actualizado correctamente' });
  }

  return json({ ok: false, error: 'Acción no válida' }, 400);
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
