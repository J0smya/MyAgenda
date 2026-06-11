import { pool } from "./db";
import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "myagenda-dev-secret-2026";

function firmar(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verificar(token: string): Record<string, any> | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

export async function crearSesion(idUsuario: string): Promise<string> {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 días
  return firmar({ id_usuario: idUsuario, exp });
}

export async function obtenerSesion(token: string) {
  const payload = verificar(token);
  if (!payload || !payload.id_usuario) return null;
  if (payload.exp < Date.now()) return null;

  try {
    const result = await pool.query(
      `SELECT id_usuario, nombre, email, foto_perfil, telefono
       FROM public.usuario
       WHERE id_usuario = $1`,
      [payload.id_usuario]
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function eliminarSesion(_token: string) {
  // Token es stateless — no requiere acción en BD
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
