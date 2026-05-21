// src/pages/api/dashboard.ts
<<<<<<< HEAD
export const prerender = false;

=======
>>>>>>> 860274bcb90a8d405831fbe750cc69bd2a78588f
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

<<<<<<< HEAD
// --- MÉTODO POST: CREAR TAREA ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validación básica
    if (!body.titulo) {
        return new Response(JSON.stringify({ success: false, message: "El título es obligatorio." }), { status: 400 });
    }

    // Asegúrate de que estos nombres de columnas coincidan EXACTAMENTE con tu tabla en pgAdmin
    const query = `
      INSERT INTO public.tarea (
        titulo, 
        descripcion, 
        fecha_inicio, 
        hora_inicio, 
        prioridad, 
        categoria,
        estado, 
        fecha_creacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', NOW())
      RETURNING *;
    `;

    const values = [
      body.titulo.trim(),
      body.descripcion?.trim() || "",
      body.fecha || null,
      body.hora || null,
      body.prioridad || "media",
      body.categoria || "personal"
    ];
=======
// ── Cliente Supabase ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY   // service key para operaciones server-side
);

// ── Tipos ─────────────────────────────────────────────────────────────────────
type EstadoTarea    = "pendiente" | "en_progreso" | "completada" | "cancelada";
type PrioridadTarea = "alta" | "media" | "baja";

interface TareaInsert {
  titulo:             string;
  descripcion?:       string | null;
  fecha_inicio?:      string | null;   // ISO date  "YYYY-MM-DD"
  fecha_vencimiento?: string | null;
  hora_inicio?:       string | null;   // "HH:MM"
  hora_fin?:          string | null;
  estado:             EstadoTarea;
  prioridad:          PrioridadTarea;
  id_proyecto?:       string | null;
}
>>>>>>> 860274bcb90a8d405831fbe750cc69bd2a78588f

interface ArchivoInsert {
  nombre:       string;
  ruta_archivo: string;
  tipo:         string;
  tamano:       number;
  id_tarea:     string;
}

<<<<<<< HEAD
    return new Response(JSON.stringify({ success: true, tarea: result.rows[0] }), { status: 200 });

  } catch (error: any) {
    console.error("❌ ERROR EN EL SERVIDOR (POST):", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};

// --- MÉTODO GET: OBTENER TAREAS ---
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query('SELECT * FROM public.tarea ORDER BY fecha_creacion DESC');
    return new Response(JSON.stringify({ success: true, tareas: result.rows }), { status: 200 });
  } catch (error: any) {
    console.error("❌ ERROR AL OBTENER TAREAS:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
=======
// ─────────────────────────────────────────────────────────────────────────────
// GET — devuelve todas las tareas activas (sin soft-delete)
// ─────────────────────────────────────────────────────────────────────────────
export const GET: APIRoute = async () => {
  try {
    const { data: tareas, error } = await supabase
      .from("tareas")
      .select(`
        id_tarea,
        titulo,
        descripcion,
        fecha_inicio,
        fecha_vencimiento,
        hora_inicio,
        hora_fin,
        estado,
        prioridad,
        id_proyecto,
        fecha_creacion,
        archivo (
          id_archivo,
          nombre,
          ruta_archivo,
          tipo,
          tamano
        )
      `)
      .is("deleted_at", null)
      .order("fecha_inicio", { ascending: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, tareas: tareas ?? [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[GET /api/dashboard]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
>>>>>>> 860274bcb90a8d405831fbe750cc69bd2a78588f
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — crea una nueva tarea (con o sin archivo adjunto y/o nota)
// ─────────────────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  try {
<<<<<<< HEAD
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ success: false, message: "ID no proporcionado" }), { status: 400 });

    const result = await pool.query('DELETE FROM public.tarea WHERE id_tarea = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ success: false, message: "Tarea no encontrada" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, message: "Tarea eliminada" }), { status: 200 });
  } catch (error: any) {
    console.error("❌ ERROR AL ELIMINAR:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
=======
    const contentType = request.headers.get("content-type") ?? "";

    // ── Parsear body (JSON o FormData) ────────────────────────────────────────
    let fields: Record<string, string> = {};
    let archivoFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (key === "archivo" && value instanceof File) {
          archivoFile = value;
        } else {
          fields[key] = String(value);
        }
      });
    } else {
      fields = await request.json();
    }

    // ── Validación mínima ─────────────────────────────────────────────────────
    const titulo = fields.titulo?.trim();
    if (!titulo) {
      return new Response(
        JSON.stringify({ success: false, message: "El título es obligatorio." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Mapeo → tabla tareas ──────────────────────────────────────────────────
    const prioridadesValidas: PrioridadTarea[] = ["alta", "media", "baja"];
    const prioridad: PrioridadTarea = prioridadesValidas.includes(
      fields.prioridad as PrioridadTarea
    )
      ? (fields.prioridad as PrioridadTarea)
      : "media";

    const tareaPayload: TareaInsert = {
      titulo,
      descripcion:       fields.descripcion?.trim()  || null,
      fecha_inicio:      fields.fecha                || null,  // "YYYY-MM-DD"
      fecha_vencimiento: fields.fecha_vencimiento    || null,
      hora_inicio:       fields.hora                 || null,  // "HH:MM"
      hora_fin:          fields.hora_fin             || null,
      estado:            "pendiente",
      prioridad,
      id_proyecto:       fields.id_proyecto          || null,
    };

    // ── INSERT tarea ──────────────────────────────────────────────────────────
    const { data: tareaData, error: tareaError } = await supabase
      .from("tareas")
      .insert(tareaPayload)
      .select("id_tarea")
      .single();

    if (tareaError) throw tareaError;

    const idTarea: string = tareaData.id_tarea;

    // ── INSERT nota (si viene) ────────────────────────────────────────────────
    if (fields.nota_contenido) {
      const { error: notaError } = await supabase
        .from("notas")
        .insert({
          id_tarea:    idTarea,
          nota_titulo: fields.nota_titulo || "Nota sin título",
          contenido:   fields.nota_contenido,
        });

      if (notaError) {
        console.warn("[POST /api/dashboard] Error al guardar nota:", notaError.message);
      }
    }

    // ── SUBIR ARCHIVO (si viene) ──────────────────────────────────────────────
    if (archivoFile && archivoFile.size > 0) {
      try {
        // Opción A: guardar en disco local (útil en desarrollo / VPS)
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const ext      = path.extname(archivoFile.name);
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const rutaLocal = path.join(uploadsDir, safeName);

        const buffer = Buffer.from(await archivoFile.arrayBuffer());
        await writeFile(rutaLocal, buffer);

        const rutaPublica = `/uploads/${safeName}`;

        // Opción B (comentada): subir a Supabase Storage
        // const { data: storageData, error: storageErr } = await supabase.storage
        //   .from("archivos")
        //   .upload(`tareas/${idTarea}/${safeName}`, buffer, {
        //     contentType: archivoFile.type,
        //     upsert: false,
        //   });
        // if (storageErr) throw storageErr;
        // const rutaPublica = storageData.path;

        const archivoPayload: ArchivoInsert = {
          nombre:       archivoFile.name,
          ruta_archivo: rutaPublica,
          tipo:         archivoFile.type || "application/octet-stream",
          tamano:       archivoFile.size,
          id_tarea:     idTarea,
        };

        const { error: archivoError } = await supabase
          .from("archivo")
          .insert(archivoPayload);

        if (archivoError) {
          console.warn("[POST /api/dashboard] Error al guardar archivo:", archivoError.message);
        }
      } catch (fileErr: any) {
        console.warn("[POST /api/dashboard] Error procesando archivo:", fileErr.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, id_tarea: idTarea }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[POST /api/dashboard]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — soft-delete de una tarea por ?id=<uuid>
// ─────────────────────────────────────────────────────────────────────────────
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id  = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "Falta el parámetro id." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Soft-delete: sólo marcamos deleted_at
    const { error } = await supabase
      .from("tareas")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id_tarea", id)
      .is("deleted_at", null);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[DELETE /api/dashboard]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT — actualizar campos de una tarea existente
// Body JSON: { id_tarea, titulo?, descripcion?, fecha_inicio?,
//              hora_inicio?, prioridad?, estado? }
// ─────────────────────────────────────────────────────────────────────────────
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id_tarea, ...rest } = body;

    if (!id_tarea) {
      return new Response(
        JSON.stringify({ success: false, message: "Falta id_tarea." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sólo permitimos actualizar campos válidos de la tabla
    const camposPermitidos: (keyof TareaInsert)[] = [
      "titulo", "descripcion", "fecha_inicio", "fecha_vencimiento",
      "hora_inicio", "hora_fin", "estado", "prioridad", "id_proyecto",
    ];

    const updates: Partial<TareaInsert> = {};
    for (const campo of camposPermitidos) {
      if (campo in rest) {
        (updates as any)[campo] = rest[campo];
      }
    }

    if (!Object.keys(updates).length) {
      return new Response(
        JSON.stringify({ success: false, message: "No hay campos para actualizar." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase
      .from("tareas")
      .update(updates)
      .eq("id_tarea", id_tarea)
      .is("deleted_at", null);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[PUT /api/dashboard]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Error interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
>>>>>>> 860274bcb90a8d405831fbe750cc69bd2a78588f
};