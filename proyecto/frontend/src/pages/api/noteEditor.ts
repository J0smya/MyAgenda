// src/pages/api/noteEditor.ts
import type { APIRoute } from "astro";
import { pool } from "../../lib/db";


export const GET: APIRoute = async ({ url }) => {
  try {
    const idTarea = url.searchParams.get("id_tarea");
    const idNota  = url.searchParams.get("id_nota");

    let rows: any[];

    if (idNota) {
      const r = await pool.query(
        `SELECT n.id_nota,
                n.contenido,
                n.fecha_creacion,
                n.id_tarea,
                t.titulo AS tarea_titulo
         FROM nota n
         LEFT JOIN tarea t ON t.id_tarea = n.id_tarea
         WHERE n.id_nota = $1
           AND n.deleted_at IS NULL`,
        [idNota]
      );
      rows = r.rows;

    } else if (idTarea) {
      const r = await pool.query(
        `SELECT n.id_nota,
                n.contenido,
                n.fecha_creacion,
                n.id_tarea,
                t.titulo AS tarea_titulo
         FROM nota n
         LEFT JOIN tarea t ON t.id_tarea = n.id_tarea
         WHERE n.id_tarea = $1
           AND n.deleted_at IS NULL
         ORDER BY n.fecha_creacion DESC`,
        [idTarea]
      );
      rows = r.rows;

    } else {
      const r = await pool.query(
        `SELECT n.id_nota,
                n.contenido,
                n.fecha_creacion,
                n.id_tarea,
                t.titulo AS tarea_titulo
         FROM nota n
         LEFT JOIN tarea t ON t.id_tarea = n.id_tarea
         WHERE n.deleted_at IS NULL
         ORDER BY n.fecha_creacion DESC`
      );
      rows = r.rows;
    }

    return ok({ notas: rows });
  } catch (err) {
    console.error("[GET /api/noteEditor]", err);
    return fail("Error al obtener notas", 500);
  }
};


export const POST: APIRoute = async ({ request }) => {
  try {
    const body     = await parseBody(request);
    const contenido = String(body.contenido ?? "").trim();
    const idTarea   = String(body.id_tarea  ?? "").trim();

    if (!contenido) return fail("El contenido no puede estar vacío", 400);
    if (!idTarea)   return fail("id_tarea es obligatorio", 400);

    // Verificar que la tarea existe
    const check = await pool.query(
      `SELECT id_tarea FROM tarea WHERE id_tarea = $1 LIMIT 1`,
      [idTarea]
    );
    if (check.rowCount === 0) return fail("Tarea no encontrada", 404);

    // Insertar nota
    // id_nota        → gen_random_uuid() generado en BD
    // fecha_creacion → DEFAULT NOW() en BD
    // deleted_at     → NULL por defecto
    const { rows } = await pool.query(
      `INSERT INTO nota (id_nota, contenido, id_tarea)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id_nota, contenido, fecha_creacion, id_tarea`,
      [contenido, idTarea]
    );

    return ok({ nota: rows[0] }, 201);
  } catch (err) {
    console.error("[POST /api/noteEditor]", err);
    return fail("Error al guardar la nota", 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body      = await parseBody(request);
    const idNota    = String(body.id_nota   ?? "").trim();
    const contenido = String(body.contenido ?? "").trim();

    if (!idNota)    return fail("id_nota es obligatorio", 400);
    if (!contenido) return fail("contenido es obligatorio", 400);

    const check = await pool.query(
      `SELECT id_nota FROM nota WHERE id_nota = $1 AND deleted_at IS NULL`,
      [idNota]
    );
    if (check.rowCount === 0) return fail("Nota no encontrada", 404);

    const { rows } = await pool.query(
      `UPDATE nota
       SET contenido = $1
       WHERE id_nota = $2
         AND deleted_at IS NULL
       RETURNING id_nota, contenido, fecha_creacion, id_tarea`,
      [contenido, idNota]
    );

    return ok({ nota: rows[0] });
  } catch (err) {
    console.error("[PUT /api/noteEditor]", err);
    return fail("Error al actualizar la nota", 500);
  }
};


export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body   = await parseBody(request);
    const idNota = String(body.id_nota ?? "").trim();

    if (!idNota) return fail("id_nota es obligatorio", 400);

    const check = await pool.query(
      `SELECT id_nota FROM nota WHERE id_nota = $1 AND deleted_at IS NULL`,
      [idNota]
    );
    if (check.rowCount === 0) return fail("Nota no encontrada o ya eliminada", 404);

    await pool.query(
      `UPDATE nota SET deleted_at = NOW() WHERE id_nota = $1`,
      [idNota]
    );

    return ok({ message: "Nota eliminada correctamente" });
  } catch (err) {
    console.error("[DELETE /api/noteEditor]", err);
    return fail("Error al eliminar la nota", 500);
  }
};


async function parseBody(request: Request): Promise<Record<string, any>> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return await request.json();
  const form = await request.formData();
  const obj: Record<string, any> = {};
  form.forEach((val, key) => { obj[key] = val; });
  return obj;
}

function ok(data: Record<string, any>, status = 200): Response {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function fail(error: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}