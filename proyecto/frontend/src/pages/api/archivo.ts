export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const archivo  = formData.get("archivo") as File;
    const idTarea  = formData.get("id_tarea")?.toString().trim();

    if (!archivo || archivo.size === 0) {
      return json({ success: false, error: "No se recibió ningún archivo." }, 400);
    }
    if (!idTarea) {
      return json({ success: false, error: "id_tarea es obligatorio." }, 400);
    }

    // Verificar que la tarea existe
    const check = await pool.query(
      `SELECT id_tarea FROM public.tarea WHERE id_tarea = $1 LIMIT 1`,
      [idTarea]
    );
    if (check.rowCount === 0) {
      return json({ success: false, error: "Tarea no encontrada." }, 404);
    }

    // Guardar archivo en /public/uploads/
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext      = archivo.name.split(".").pop() || "bin";
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = join(uploadDir, fileName);
    const buffer   = Buffer.from(await archivo.arrayBuffer());
    await writeFile(filePath, buffer);

    const rutaPublica = `/uploads/${fileName}`;

    // Guardar en BD
    const { rows } = await pool.query(
      `INSERT INTO public.archivo (id_archivo, nombre, ruta_archivo, tipo, tamano, id_tarea)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING *`,
      [archivo.name, rutaPublica, archivo.type, archivo.size, idTarea]
    );

    return json({ success: true, archivo: rows[0] });
  } catch (err: any) {
    console.error("[POST /api/archivo]", err.message);
    return json({ success: false, error: err.message }, 500);
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const idTarea = url.searchParams.get("id_tarea");
    if (!idTarea) return json({ success: false, error: "id_tarea requerido." }, 400);

    const { rows } = await pool.query(
      `SELECT * FROM public.archivo
       WHERE id_tarea = $1 AND deleted_at IS NULL
       ORDER BY fecha_subida DESC`,
      [idTarea]
    );

    return json({ success: true, archivos: rows });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id_archivo } = await request.json();
    if (!id_archivo) return json({ success: false, error: "id_archivo requerido." }, 400);

    await pool.query(
      `UPDATE public.archivo SET deleted_at = NOW() WHERE id_archivo = $1`,
      [id_archivo]
    );

    return json({ success: true });
  } catch (err: any) {
    return json({ success: false, error: err.message }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}