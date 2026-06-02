export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

// --- MÉTODO POST: CREAR TAREA (MEJORADO CON TRANSACCIÓN) ---
export const POST: APIRoute = async ({ request }) => {
  const client = await pool.connect(); // Obtener cliente para la transacción
  
  try {
    const body = await request.json();
    
    if (!body.titulo || body.titulo.trim() === "") {
        return new Response(
            JSON.stringify({ success: false, message: "El título es obligatorio." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // Iniciar transacción
    await client.query('BEGIN');

    // 1. Crear la tarea principal
    const queryTarea = `
      INSERT INTO public.tarea (
        titulo, descripcion, fecha_inicio, hora_inicio, prioridad, categoria, estado, fecha_creacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', NOW())
      RETURNING *;
    `;

    const valuesTarea = [
      body.titulo.trim(),
      body.descripcion?.trim() || "",
      body.fecha || null,
      body.hora || null,
      body.prioridad || "media",
      body.categoria || "personal"
    ];

    const resultTarea = await client.query(queryTarea, valuesTarea);
    const nuevaTarea = resultTarea.rows[0];

    // 2. Guardar nota vinculada si existe
    if (body.nota_contenido) {
      const queryNota = `
        INSERT INTO public.nota (id_tarea, nota_titulo, contenido, fecha_creacion)
        VALUES ($1, $2, $3, NOW());
      `;
      await client.query(queryNota, [
        nuevaTarea.id_tarea,
        body.nota_titulo || "Nota sin título",
        body.nota_contenido
      ]);
    }

    // Confirmar cambios
    await client.query('COMMIT');

    return new Response(
      JSON.stringify({ success: true, tarea: nuevaTarea }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    // Si falla, revertir todo
    await client.query('ROLLBACK');
    console.error("Error al crear tarea:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    // Liberar conexión siempre
    client.release();
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

    // 1. Eliminar notas asociadas
    await client.query(`DELETE FROM public.nota WHERE id_tarea = $1;`, [id]);

    // 2. Eliminar tarea principal
    const result = await client.query(`DELETE FROM public.tarea WHERE id_tarea = $1 RETURNING *;`, [id]);

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