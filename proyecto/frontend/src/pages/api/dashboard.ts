export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

// --- MÉTODO POST: CREAR TAREA ---
export const POST: APIRoute = async ({ request }) => {
  const client = await pool.connect();
  try {
    const body = await request.json();
    if (!body.titulo || body.titulo.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, message: "El título es obligatorio." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    await client.query('BEGIN');
    const resultTarea = await client.query(
      `INSERT INTO public.tarea (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, estado, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW())
       RETURNING *`,
      [body.titulo.trim(), body.descripcion?.trim() || "", body.fecha || null, body.hora || null, body.prioridad || "media"]
    );
    const nuevaTarea = resultTarea.rows[0];
    if (body.nota_contenido) {
      await client.query(
        `INSERT INTO public.nota (id_tarea, nota_titulo, contenido, fecha_creacion) VALUES ($1, $2, $3, NOW())`,
        [nuevaTarea.id_tarea, body.nota_titulo || "Nota sin título", body.nota_contenido]
      );
    }
    await client.query('COMMIT');
    return new Response(
      JSON.stringify({ success: true, tarea: nuevaTarea }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Error al crear tarea:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
};

// --- MÉTODO GET: OBTENER TAREAS ---
// FIX: TO_CHAR convierte fecha_inicio (tipo date de PG) a string "YYYY-MM-DD" ANTES
// de que el driver pg lo serialice. Sin esto, pg lo convierte a Date JS en UTC y
// en Colombia (UTC-5) new Date("2026-06-10T00:00:00Z") da "2026-06-09" → tarea
// no aparece en el día correcto o no aparece porque el string no coincide.
// FIX: WHERE deleted_at IS NULL filtra tareas eliminadas con soft-delete.
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query(`
      SELECT
        id_tarea,
        titulo,
        descripcion,
        TO_CHAR(fecha_inicio, 'YYYY-MM-DD')      AS fecha_inicio,
        hora_inicio,
        prioridad,
        estado,
        fecha_creacion
      FROM public.tarea
      WHERE deleted_at IS NULL
      ORDER BY fecha_creacion DESC
    `);
    return new Response(
      JSON.stringify({ success: true, tareas: result.rows }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error al obtener tareas:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// --- MÉTODO DELETE: ELIMINAR TAREA ---
export const DELETE: APIRoute = async ({ url }) => {
  const client = await pool.connect();
  try {
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "ID no proporcionado" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    await client.query('BEGIN');
    await client.query(`DELETE FROM public.nota WHERE id_tarea = $1`, [id]);
    const result = await client.query(
      `DELETE FROM public.tarea WHERE id_tarea = $1 RETURNING *`, [id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return new Response(
        JSON.stringify({ success: false, message: "Tarea no encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    await client.query('COMMIT');
    return new Response(
      JSON.stringify({ success: true, message: "Tarea eliminada correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Error al eliminar tarea:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
};