export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { obtenerTokenDeCookie, obtenerSesion } from '../../lib/sesion';

export const POST: APIRoute = async ({ request }) => {
  const token = obtenerTokenDeCookie(request.headers.get('cookie'));
  if (!token) return json({ ok: false, error: 'No autorizado' }, 401);

  const sesion = await obtenerSesion(token);
  if (!sesion) return json({ ok: false, error: 'Sesión expirada' }, 401);

  try {
    const formData = await request.formData();
    const nombre    = formData.get('nombre')?.toString().trim();
    const fotoFile  = formData.get('foto') as File | null;

    if (!nombre || nombre.length === 0) {
      return json({ ok: false, error: 'El nombre es requerido' }, 400);
    }

    let fotoPerfil: string | undefined;

    if (fotoFile && fotoFile.size > 0) {
      if (fotoFile.size > 2 * 1024 * 1024) {
        return json({ ok: false, error: 'La imagen no puede superar 2 MB' }, 400);
      }
      const ext  = (fotoFile.name.split('.').pop() || 'jpg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const buffer = Buffer.from(await fotoFile.arrayBuffer());
      fotoPerfil = `data:${mime};base64,${buffer.toString('base64')}`;
    }

    if (fotoPerfil) {
      await pool.query(
        'UPDATE public.usuario SET nombre = $1, foto_perfil = $2 WHERE id_usuario = $3',
        [nombre, fotoPerfil, sesion.id_usuario]
      );
    } else {
      await pool.query(
        'UPDATE public.usuario SET nombre = $1 WHERE id_usuario = $2',
        [nombre, sesion.id_usuario]
      );
    }

    return json({ ok: true, nombre, fotoPerfil: fotoPerfil ?? null });

  } catch (err: any) {
    console.error('config-guardar error:', err.message);
    return json({ ok: false, error: 'Error interno del servidor' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
