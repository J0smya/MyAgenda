import { pool } from './db';
import { enviarRecordatorioVencimiento } from './email';

export async function procesarRecordatorios(): Promise<number> {
  const { rows: tareas } = await pool.query(`
    SELECT t.id_tarea, t.titulo, t.descripcion,
           TO_CHAR(t.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
           t.hora_inicio, t.prioridad, t.recordatorio_minutos, u.email
    FROM public.tarea t
    JOIN public.usuario u ON u.id_usuario = t.id_usuario
    WHERE t.recordatorio_activo = TRUE
      AND t.recordatorio_enviado = FALSE
      AND t.estado = 'pendiente'
      AND t.hora_inicio IS NOT NULL
      AND (t.fecha_inicio::date + t.hora_inicio::time)::timestamp
            - t.recordatorio_minutos * INTERVAL '1 minute'
          BETWEEN (NOW() AT TIME ZONE 'America/Bogota') - INTERVAL '15 minutes'
              AND (NOW() AT TIME ZONE 'America/Bogota') + INTERVAL '30 seconds'
  `);

  if (tareas.length > 0) {
    console.log(`[recordatorio] ${tareas.length} tarea(s) listas para notificar`);
  }

  let enviados = 0;
  for (const tarea of tareas) {
    try {
      await enviarRecordatorioVencimiento(tarea.email, {
        titulo:       tarea.titulo,
        fecha_inicio: tarea.fecha_inicio,
        hora_inicio:  tarea.hora_inicio,
        prioridad:    tarea.prioridad,
      });
      await pool.query(
        `UPDATE public.tarea SET recordatorio_enviado = TRUE WHERE id_tarea = $1`,
        [tarea.id_tarea]
      );
      enviados++;
    } catch (e: any) {
      console.error(`[recordatorio] Error tarea ${tarea.id_tarea}:`, e.message);
    }
  }
  return enviados;
}
