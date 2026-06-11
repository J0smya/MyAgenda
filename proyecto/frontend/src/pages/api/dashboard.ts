
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

      const fechas = generarFechas({
        fechaInicio : body.fecha,
        frecuencia  : body.frecuencia,
        intervalo   : body.intervalo || 1,
        fechaFin    : body.fecha_fin || null,
        totalOcurr  : body.total_ocurr || 10,
        diasSemana  : body.dias_semana || null,
      });

      const tareasCreadas = [];
      for (let i = 0; i < fechas.length; i++) {
        const { rows: [tarea] } = await client.query(
          `INSERT INTO public.tarea
             (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, estado, fecha_creacion)
           VALUES ($1,$2,$3,$4,$5,'pendiente',NOW()) RETURNING *`,
          [
            body.titulo.trim(),
            body.descripcion?.trim() || "",
            fechas[i],
            body.hora      || null,
            body.prioridad || "media",
          ]
        );

        await client.query(
          `INSERT INTO public.recurrencia_instancia (id_serie, id_tarea, ocurrencia_num)
           VALUES ($1,$2,$3)`,
          [serie.id_serie, tarea.id_tarea, i + 1]
        );

        if (i === 0 && body.nota_contenido) {
          await client.query(
            `INSERT INTO public.nota (id_tarea, contenido, fecha_creacion)
             VALUES ($1,$2,NOW())`,
            [tarea.id_tarea, body.nota_contenido]
          );
        }

        tareasCreadas.push(tarea);
      }

      await client.query("COMMIT");
      return res({ success: true, recurrente: true, serie, tareas: tareasCreadas });
    }

    await client.query("BEGIN");

    const resultTarea = await client.query(
      `INSERT INTO public.tarea
         (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, estado, fecha_creacion, id_usuario)
       VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW(), $6)
       RETURNING *`,
      [
        body.titulo.trim(),
        body.descripcion?.trim() || "",
        body.fecha  || null,
        body.hora   || null,
        body.prioridad || "media",
        idUsuario,
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
         fecha_creacion
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

// --- DELETE: ELIMINAR TAREA (solo si pertenece al usuario autenticado) -------
export const DELETE: APIRoute = async ({ request, url }) => {
  const idUsuario = await getUsuarioId(request);
  if (!idUsuario) return noAutorizado();

  const client = await pool.connect();
  try {
    const id   = url.searchParams.get("id");
    const modo = url.searchParams.get("modo") ?? "simple";

    if (!id) return res({ success: false, message: "ID no proporcionado." }, 400);

    await client.query("BEGIN");

    const hayTablas = await tablaRecurrenciaExiste();

    if (modo === "serie" && hayTablas) {
      const { rows: [inst] } = await client.query(
        `SELECT id_serie FROM public.recurrencia_instancia WHERE id_tarea = $1`, [id]
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

      if (rowCount === 0) {
        await client.query("ROLLBACK");
        return res({ success: false, message: "Tarea no encontrada." }, 404);
      }
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
