export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { obtenerTokenDeCookie, obtenerSesion } from '../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const token = obtenerTokenDeCookie(request.headers.get('cookie'));
  if (!token) return json({ ok: false, error: 'No autorizado' }, 401);

  const sesion = await obtenerSesion(token);
  if (!sesion) return json({ ok: false, error: 'Sesión expirada' }, 401);

  try {
    // Tareas del usuario (a través de sus proyectos)
    const tareasRes = await pool.query(`
      SELECT t.titulo, t.descripcion, t.estado, t.prioridad,
             t.fecha_inicio, t.fecha_vencimiento,
             t.hora_inicio, t.hora_fin, t.fecha_creacion
      FROM   public.tarea t
      LEFT JOIN public.proyecto p ON p.id_proyecto = t.id_proyecto
      WHERE  (p.id_usuario = $1 OR t.id_proyecto IS NULL)
        AND  t.deleted_at IS NULL
      ORDER  BY t.fecha_creacion DESC
    `, [sesion.id_usuario]);

    // Notas vinculadas a esas tareas
    const notasRes = await pool.query(`
      SELECT n.contenido, n.fecha_creacion, t.titulo AS tarea
      FROM   public.nota n
      JOIN   public.tarea t ON t.id_tarea = n.id_tarea
      LEFT JOIN public.proyecto p ON p.id_proyecto = t.id_proyecto
      WHERE  (p.id_usuario = $1 OR t.id_proyecto IS NULL)
        AND  n.deleted_at IS NULL
      ORDER  BY n.fecha_creacion DESC
    `, [sesion.id_usuario]);

    // Proyectos del usuario
    const proyectosRes = await pool.query(`
      SELECT nombre, descripcion, estado, color, fecha_creacion
      FROM   public.proyecto
      WHERE  id_usuario = $1 AND deleted_at IS NULL
      ORDER  BY fecha_creacion DESC
    `, [sesion.id_usuario]);

    const datos = {
      version: '1.0',
      exportadoEl: new Date().toISOString(),
      usuario: {
        nombre:    sesion.nombre,
        email:     sesion.email,
      },
      resumen: {
        totalTareas:    tareasRes.rows.length,
        totalNotas:     notasRes.rows.length,
        totalProyectos: proyectosRes.rows.length,
      },
      proyectos: proyectosRes.rows,
      tareas:    tareasRes.rows,
      notas:     notasRes.rows,
    };

    return new Response(JSON.stringify(datos, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="Mis_Datos_MyAgenda.json"',
      },
    });

  } catch (err: any) {
    console.error('config-exportar error:', err.message);
    return json({ ok: false, error: 'Error interno del servidor' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
