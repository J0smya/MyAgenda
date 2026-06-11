
export const prerender = false;
 
import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
 
// ─── helpers ──────────────────────────────────────────────────────────────
function res(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
 
function parseFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoDay(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}
 
/** Genera fechas para una serie recurrente (GT-85) */
function generarFechas({
  fechaInicio, frecuencia, intervalo, fechaFin, totalOcurr, diasSemana,
}: {
  fechaInicio: string;
  frecuencia: string;
  intervalo: number;
  fechaFin: string | null;
  totalOcurr: number | null;
  diasSemana: string | null;
}): string[] {
  const MAX  = totalOcurr ?? 10;
  const fechas: string[] = [];
  let  cur  = parseFecha(fechaInicio);
  const lim  = fechaFin ? parseFecha(fechaFin) : null;
  const dias = diasSemana ? diasSemana.split(",").map(Number) : null;
 
  while (fechas.length < MAX) {
    if (lim && cur > lim) break;
    if (!dias || dias.includes(isoDay(cur))) fechas.push(toISO(cur));
 
    if (frecuencia === "diaria") {
      cur.setDate(cur.getDate() + intervalo);
    } else if (frecuencia === "semanal") {
      if (dias) {
        cur.setDate(cur.getDate() + 1);
        if (isoDay(cur) === 1 && intervalo > 1)
          cur.setDate(cur.getDate() + (intervalo - 1) * 7);
      } else {
        cur.setDate(cur.getDate() + intervalo * 7);
      }
    } else {
      cur.setMonth(cur.getMonth() + intervalo);
    }
  }
  return fechas;
}
 
// ─── POST: Crear tarea simple o recurrente ────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  const client = await pool.connect();
  try {
    const body = await request.json();
 
    if (!body.titulo?.trim())
      return res({ success: false, message: "El título es obligatorio." }, 400);
 
    await client.query("BEGIN");
 
    // ── Recurrente (GT-84 / GT-85) ────────────────────────────────────────
    if (body.frecuencia) {
      if (!["diaria", "semanal", "mensual"].includes(body.frecuencia)) {
        await client.query("ROLLBACK");
        return res({ success: false, message: "Frecuencia inválida." }, 400);
      }
 
      // 1. Crear la serie en la tabla correcta (public.recurrencia_serie)
      const { rows: [serie] } = await client.query(
        `INSERT INTO public.recurrencia_serie
           (frecuencia, intervalo, fecha_inicio, fecha_fin, dias_semana, total_ocurr, fecha_creacion)
         VALUES ($1,$2,$3,$4,$5,$6, NOW()) RETURNING *`,
        [
          body.frecuencia,
          body.intervalo  || 1,
          body.fecha      || null,
          body.fecha_fin  || null,
          body.dias_semana || null,
          body.total_ocurr || null,
        ]
      );
 
      // 2. Generar fechas
      const fechas = generarFechas({
        fechaInicio : body.fecha,
        frecuencia  : body.frecuencia,
        intervalo   : body.intervalo || 1,
        fechaFin    : body.fecha_fin || null,
        totalOcurr  : body.total_ocurr || 10,
        diasSemana  : body.dias_semana || null,
      });
 
      // 3. Insertar tareas + instancias
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
            body.hora || null,
            body.prioridad || "media",
          ]
        );
 
        // Insertar instancia en la tabla de relación (vincula tarea ↔ serie)
        await client.query(
          `INSERT INTO public.recurrencia_instancia (id_serie, id_tarea, ocurrencia_num)
           VALUES ($1,$2,$3)`,
          [serie.id_serie, tarea.id_tarea, i + 1]
        );
 
        if (i === 0 && body.nota_contenido) {
          await client.query(
            `INSERT INTO public.nota (id_tarea, nota_titulo, contenido, fecha_creacion)
             VALUES ($1,$2,$3,NOW())`,
            [tarea.id_tarea, body.nota_titulo || "Nota sin título", body.nota_contenido]
          );
        }
 
        tareasCreadas.push(tarea);
      }
 
      await client.query("COMMIT");
      return res({ success: true, recurrente: true, serie, tareas: tareasCreadas });
    }
 
    // ── Tarea simple ──────────────────────────────────────────────────────
    const { rows: [nuevaTarea] } = await client.query(
      `INSERT INTO public.tarea
         (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, estado, fecha_creacion)
       VALUES ($1,$2,$3,$4,$5,'pendiente',NOW()) RETURNING *`,
      [
        body.titulo.trim(),
        body.descripcion?.trim() || "",
        body.fecha  || null,
        body.hora   || null,
        body.prioridad || "media",
      ]
    );
 
    if (body.nota_contenido) {
      await client.query(
        `INSERT INTO public.nota (id_tarea, nota_titulo, contenido, fecha_creacion)
         VALUES ($1,$2,$3,NOW())`,
        [nuevaTarea.id_tarea, body.nota_titulo || "Nota sin título", body.nota_contenido]
      );
    }
 
    await client.query("COMMIT");
    return res({ success: true, tarea: nuevaTarea });
 
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error al crear tarea:", error.message);
    return res({ success: false, error: error.message }, 500);
  } finally {
    client.release();
  }
};
 
// ─── GET: Obtener tareas con info de serie via JOIN ───────────────────────
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query(`
      SELECT
        t.*,
        ri.id_serie,
        ri.ocurrencia_num,
        rs.frecuencia,
        rs.intervalo,
        rs.fecha_fin   AS serie_fecha_fin,
        rs.dias_semana AS serie_dias_semana,
        CASE WHEN ri.id_serie IS NOT NULL THEN TRUE ELSE FALSE END AS es_recurrente
      FROM public.tarea t
      LEFT JOIN public.recurrencia_instancia ri ON ri.id_tarea  = t.id_tarea
      LEFT JOIN public.recurrencia_serie       rs ON rs.id_serie  = ri.id_serie
      ORDER BY t.fecha_creacion DESC
    `);
 
    return res({ success: true, tareas: result.rows });
  } catch (error: any) {
    console.error("Error al obtener tareas:", error.message);
    return res({ success: false, error: error.message }, 500);
  }
};
 
// ─── PUT: Editar tarea — simple, "solo este" o "toda la serie" (GT-87) ────
export const PUT: APIRoute = async ({ request }) => {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id_tarea, modo, ...campos } = body;
 
    if (!id_tarea)
      return res({ success: false, message: "id_tarea requerido." }, 400);
 
    await client.query("BEGIN");
 
    if (modo === "serie") {
      const { rows: [inst] } = await client.query(
        `SELECT id_serie FROM public.recurrencia_instancia WHERE id_tarea = $1`, [id_tarea]
      );
 
      if (!inst?.id_serie) {
        await client.query("ROLLBACK");
        return res({ success: false, message: "Esta tarea no pertenece a una serie." }, 400);
      }
 
      await client.query(
        `UPDATE public.tarea t
         SET
           titulo      = COALESCE(NULLIF($1,''), t.titulo),
           descripcion = COALESCE(NULLIF($2,''), t.descripcion),
           hora_inicio = COALESCE(NULLIF($3,''), t.hora_inicio),
           prioridad   = COALESCE(NULLIF($4,''), t.prioridad)
         FROM public.recurrencia_instancia ri
         WHERE ri.id_tarea = t.id_tarea
           AND ri.id_serie = $5
           AND t.fecha_inicio >= CURRENT_DATE`,
        [
          campos.titulo      || null,
          campos.descripcion || null,
          campos.hora        || null,
          campos.prioridad   || null,
          inst.id_serie,
        ]
      );
    } else {
      await client.query(
        `UPDATE public.tarea
         SET
           titulo       = COALESCE(NULLIF($1,''), titulo),
           descripcion  = COALESCE(NULLIF($2,''), descripcion),
           hora_inicio  = COALESCE(NULLIF($3,''), hora_inicio),
           prioridad    = COALESCE(NULLIF($4,''), prioridad),
           fecha_inicio = COALESCE($5::date,       fecha_inicio)
         WHERE id_tarea = $6`,
        [
          campos.titulo      || null,
          campos.descripcion || null,
          campos.hora        || null,
          campos.prioridad   || null,
          campos.fecha       || null,
          id_tarea,
        ]
      );
    }
 
    await client.query("COMMIT");
    return res({ success: true, modo: modo ?? "simple" });
 
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error al editar tarea:", error.message);
    return res({ success: false, error: error.message }, 500);
  } finally {
    client.release();
  }
};
 
// ─── DELETE: Eliminar — simple, "solo este" o "toda la serie" (GT-88) ────
export const DELETE: APIRoute = async ({ url }) => {
  const client = await pool.connect();
  try {
    const id   = url.searchParams.get("id");
    const modo = url.searchParams.get("modo") ?? "simple";
 
    if (!id) return res({ success: false, message: "ID no proporcionado." }, 400);
 
    await client.query("BEGIN");
 
    if (modo === "serie") {
      const { rows: [inst] } = await client.query(
        `SELECT id_serie FROM public.recurrencia_instancia WHERE id_tarea = $1`, [id]
      );
 
      if (inst?.id_serie) {
        const { rows: instancias } = await client.query(
          `SELECT id_tarea FROM public.recurrencia_instancia WHERE id_serie = $1`,
          [inst.id_serie]
        );
        const ids = instancias.map((r: any) => r.id_tarea);
 
        if (ids.length) {
          await client.query(
            `DELETE FROM public.nota WHERE id_tarea = ANY($1::int[])`, [ids]
          );
        }
 
        await client.query(
          `DELETE FROM public.recurrencia_instancia WHERE id_serie = $1`, [inst.id_serie]
        );
       
        await client.query(
            `DELETE FROM public.recurrencia_serie WHERE id_serie = $1`, [inst.id_serie]
        );
 
        if (ids.length) {
          await client.query(
            `DELETE FROM public.tarea WHERE id_tarea = ANY($1::int[])`, [ids]
          );
        }
      }
 
    } else {
      await client.query(`DELETE FROM public.nota              WHERE id_tarea = $1`, [id]);
      await client.query(`DELETE FROM public.recurrencia_instancia WHERE id_tarea = $1`, [id]);
 
      const { rowCount } = await client.query(
        `DELETE FROM public.tarea WHERE id_tarea = $1 RETURNING *`, [id]
      );
 
      if (rowCount === 0) {
        await client.query("ROLLBACK");
        return res({ success: false, message: "Tarea no encontrada." }, 404);
      }
    }
 
    await client.query("COMMIT");
    return res({ success: true, message: "Eliminada correctamente." });
 
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar tarea:", error.message);
    return res({ success: false, error: error.message }, 500);
  } finally {
    client.release();
  }
};
