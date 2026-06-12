export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import { obtenerTokenDeCookie, obtenerSesion } from "../../lib/sesion";

// ── Helper: obtener id_usuario desde la cookie de sesión ──────────────────────
async function getUsuarioId(request: Request): Promise<string | null> {
  const token = obtenerTokenDeCookie(request.headers.get("cookie"));
  if (!token) return null;
  const sesion = await obtenerSesion(token);
  return sesion?.id_usuario ?? null;
}

// ── Helper: respuesta no autorizada ──────────────────────────────────────────
function noAutorizado() {
  return new Response(
    JSON.stringify({ success: false, error: "No autorizado. Inicia sesión." }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

// --- POST: CREAR TAREA (vinculada al usuario autenticado) --------------------
export const POST: APIRoute = async ({ request }) => {
  const idUsuario = await getUsuarioId(request);
  if (!idUsuario) return noAutorizado();

  const client = await pool.connect();
  try {
    const body = await request.json();

    if (!body.titulo || body.titulo.trim() === "") {
      return new Response(
        JSON.stringify({ success: false, message: "El título es obligatorio." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await client.query("BEGIN");

    const resultTarea = await client.query(
      `INSERT INTO public.tarea
         (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, estado, fecha_creacion, id_usuario, categoria)
       VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW(), $6, $7)
       RETURNING *`,
      [
        body.titulo.trim(),
        body.descripcion?.trim() || "",
        body.fecha  || null,
        body.hora   || null,
        body.prioridad || "media",
        idUsuario,
        body.categoria || "personal",
      ]
    );
    const nuevaTarea = resultTarea.rows[0];

    if (body.nota_contenido) {
      await client.query(
        `INSERT INTO public.nota (id_tarea, nota_titulo, contenido, fecha_creacion)
         VALUES ($1, $2, $3, NOW())`,
        [nuevaTarea.id_tarea, body.nota_titulo || "Nota sin título", body.nota_contenido]
      );
    }

    await client.query("COMMIT");
    return new Response(
      JSON.stringify({ success: true, tarea: nuevaTarea }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("[dashboard POST] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
};

// --- GET: OBTENER TAREAS (solo las del usuario autenticado) ------------------
// TO_CHAR evita que pg convierta date → Date JS con desfase UTC-5 (Colombia).
// WHERE id_usuario = $1 garantiza aislamiento total entre usuarios.
export const GET: APIRoute = async ({ request }) => {
  const idUsuario = await getUsuarioId(request);
  if (!idUsuario) return noAutorizado();

  try {
    const result = await pool.query(
      `SELECT
         id_tarea,
         titulo,
         descripcion,
         TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
         hora_inicio,
         prioridad,
         estado,
         fecha_creacion,
         COALESCE(categoria, 'personal') AS categoria
       FROM public.tarea
       WHERE id_usuario  = $1
         AND deleted_at  IS NULL
       ORDER BY fecha_creacion DESC`,
      [idUsuario]
    );

    return new Response(
      JSON.stringify({ success: true, tareas: result.rows }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[dashboard GET] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// --- PUT: ACTUALIZAR TAREA (estado, titulo, etc.) ----------------------------
export const PUT: APIRoute = async ({ request }) => {
  const idUsuario = await getUsuarioId(request);
  if (!idUsuario) return noAutorizado();

  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id_tarea, estado, titulo, descripcion, fecha_inicio, hora_inicio, prioridad, categoria } = body;

    if (!id_tarea) {
      return new Response(
        JSON.stringify({ success: false, message: "ID de tarea requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar que la tarea pertenece al usuario
    const check = await client.query(
      `SELECT id_tarea FROM public.tarea WHERE id_tarea = $1 AND id_usuario = $2`,
      [id_tarea, idUsuario]
    );
    if (check.rowCount === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Tarea no encontrada o sin permiso" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await client.query(
      `UPDATE public.tarea SET
         estado       = COALESCE($1::estado_tarea, estado),
         titulo       = COALESCE($2, titulo),
         descripcion  = COALESCE($3, descripcion),
         fecha_inicio = COALESCE($4::date, fecha_inicio),
         hora_inicio  = COALESCE($5::time, hora_inicio),
         prioridad    = COALESCE($6::prioridad_tarea, prioridad),
         categoria    = COALESCE($9, categoria)
       WHERE id_tarea = $7 AND id_usuario = $8
       RETURNING *`,
      [
        estado   || null,
        titulo   || null,
        descripcion !== undefined ? descripcion : null,
        fecha_inicio || null,
        hora_inicio  || null,
        prioridad    || null,
        id_tarea,
        idUsuario,
        categoria    || null,
      ]
    );

    return new Response(
      JSON.stringify({ success: true, tarea: result.rows[0] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[dashboard PUT] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
};

// --- DELETE: ELIMINAR TAREA (solo si pertenece al usuario autenticado) -------
export const DELETE: APIRoute = async ({ request, url }) => {
  const idUsuario = await getUsuarioId(request);
  if (!idUsuario) return noAutorizado();

  const client = await pool.connect();
  try {
    const id = url.searchParams.get("id");
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "ID no proporcionado" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await client.query("BEGIN");

    // Verificar que la tarea pertenece al usuario antes de eliminar
    const check = await client.query(
      `SELECT id_tarea FROM public.tarea WHERE id_tarea = $1 AND id_usuario = $2`,
      [id, idUsuario]
    );
    if (check.rowCount === 0) {
      await client.query("ROLLBACK");
      return new Response(
        JSON.stringify({ success: false, message: "Tarea no encontrada o sin permiso" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    await client.query(`DELETE FROM public.nota  WHERE id_tarea   = $1`, [id]);
    await client.query(`DELETE FROM public.tarea WHERE id_tarea   = $1`, [id]);

    await client.query("COMMIT");
    return new Response(
      JSON.stringify({ success: true, message: "Tarea eliminada correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("[dashboard DELETE] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    client.release();
  }
};