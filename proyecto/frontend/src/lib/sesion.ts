import { pool } from "./db";
import { randomBytes } from "crypto";

export async function crearSesion(idUsuario: string): Promise<string> {
  const token     = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 días

  await pool.query(
    `INSERT INTO public.sesion (id_usuario, token, expires_at)
     VALUES ($1, $2, $3)`,
    [idUsuario, token, expiresAt]
  );

  return token;
}

export async function obtenerSesion(token: string) {
  const result = await pool.query(
    `SELECT s.id, s.id_usuario, s.expires_at,
            u.nombre, u.email, u.foto_perfil, u.google_id
     FROM public.sesion s
     JOIN public.usuario u ON u.id_usuario = s.id_usuario
     WHERE s.token = $1
       AND s.expires_at > NOW()`,
    [token]
  );

  return result.rows[0] ?? null;
}

export async function eliminarSesion(token: string) {
  await pool.query(
    `DELETE FROM public.sesion WHERE token = $1`,
    [token]
  );
}

export function obtenerTokenDeCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

export function cookieSesion(token: string): string {
  return `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function cookieCerrarSesion(): string {
  return `session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}