export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

// --- MÉTODO POST: CREAR TAREA ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    console.log("Creando tarea:", body.titulo);

    const query = `
      INSERT INTO public.tarea (
        titulo, 
        descripcion, 
        fecha_inicio, 
        hora_inicio, 
        prioridad, 
        categoria,
        etiquetas,
        estado, 
        fecha_creacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', NOW())
      RETURNING *;
    `;

    const values = [
      body.titulo || "Sin título",
      body.descripcion || "",
      body.fecha || null,
      body.hora || null,
      body.prioridad || "media",
      body.categoria || "personal",
      body.etiquetas || null
    ];

    const result = await pool.query(query, values);

    return new Response(
      JSON.stringify({ success: true, tarea: result.rows[0] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// --- MÉTODO GET: OBTENER TAREAS ---
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query(`
      SELECT * FROM public.tarea 
      ORDER BY fecha_creacion DESC
    `);

    return new Response(
      JSON.stringify({ success: true, tareas: result.rows }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
};

// --- MÉTODO DELETE: ELIMINAR TAREA ---
export const DELETE: APIRoute = async ({ url }) => {
  try {
    // Obtenemos el ID de la URL (ej: /api/dashboard?id=123)
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "ID no proporcionado" }),
        { status: 400 }
      );
    }

    const query = `DELETE FROM public.tarea WHERE id_tarea = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Tarea no encontrada" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Tarea eliminada correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error al eliminar:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
};

