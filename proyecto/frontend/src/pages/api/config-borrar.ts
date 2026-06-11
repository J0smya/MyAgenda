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
    // Soft-delete de tareas completadas del usuario (a través de sus proyectos)
    const result = await pool.query(`
      UPDATE public.tarea
      SET    deleted_at = NOW()
      WHERE  estado = 'completada'
        AND  deleted_at IS NULL
        AND  (
          id_proyecto IN (
            SELECT id_proyecto FROM public.proyecto WHERE id_usuario = $1
          )
          OR id_proyecto IS NULL
        )
      RETURNING id_tarea
    `, [sesion.id_usuario]);

    return json({ ok: true, eliminadas: result.rowCount ?? 0 });

  } catch (err: any) {
    console.error('config-borrar error:', err.message);
    return json({ ok: false, error: 'Error interno del servidor' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
