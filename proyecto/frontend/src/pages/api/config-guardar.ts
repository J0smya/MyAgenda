export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { obtenerTokenDeCookie, obtenerSesion } from '../../lib/sesion';
import path from 'path';
import fs from 'fs/promises';

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
      const ext = (fotoFile.name.split('.').pop() || 'jpg').toLowerCase();
      const nombreArchivo = `perfil_${sesion.id_usuario}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const buffer = Buffer.from(await fotoFile.arrayBuffer());
      await fs.writeFile(path.join(uploadsDir, nombreArchivo), buffer);
      fotoPerfil = `/uploads/${nombreArchivo}`;
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
