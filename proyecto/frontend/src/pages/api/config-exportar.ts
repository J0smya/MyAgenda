export const prerender = false;

import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { obtenerTokenDeCookie, obtenerSesion } from '../../lib/sesion';

export const GET: APIRoute = async ({ request }) => {
  const token = obtenerTokenDeCookie(request.headers.get('cookie'));
  if (!token) return json({ ok: false, error: 'No autorizado' }, 401);

  const sesion = await obtenerSesion(token);
  if (!sesion) return json({ ok: false, error: 'Sesión expirada' }, 401);

  try {
    const tareasRes = await pool.query(`
      SELECT titulo, descripcion, estado, prioridad,
             TO_CHAR(fecha_inicio, 'YYYY-MM-DD')      AS fecha_inicio,
             TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
             hora_inicio, hora_fin,
             TO_CHAR(fecha_creacion, 'YYYY-MM-DD')    AS fecha_creacion
      FROM   public.tarea
      WHERE  id_usuario = $1
        AND  deleted_at IS NULL
      ORDER  BY fecha_creacion DESC
    `, [sesion.id_usuario]);

    const notasRes = await pool.query(`
      SELECT n.nota_titulo, n.contenido,
             TO_CHAR(n.fecha_creacion, 'YYYY-MM-DD') AS fecha_creacion,
             t.titulo AS tarea
      FROM   public.nota n
      JOIN   public.tarea t ON t.id_tarea = n.id_tarea
      WHERE  t.id_usuario = $1
        AND  n.deleted_at IS NULL
      ORDER  BY n.fecha_creacion DESC
    `, [sesion.id_usuario]);

    const proyectosRes = await pool.query(`
      SELECT nombre, descripcion, estado, color,
             TO_CHAR(fecha_creacion, 'YYYY-MM-DD') AS fecha_creacion
      FROM   public.proyecto
      WHERE  id_usuario = $1 AND deleted_at IS NULL
      ORDER  BY fecha_creacion DESC
    `, [sesion.id_usuario]);

    const ahora = new Date();
    const fechaExport = ahora.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const horaExport = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    function fmt(val: any): string {
      if (!val) return '—';
      const s = String(val);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return s;
    }

    function estadoBadge(estado: string): string {
      const map: Record<string, [string, string]> = {
        pendiente:  ['#f59e0b', '#fffbeb'],
        en_progreso: ['#3b82f6', '#eff6ff'],
        completada: ['#10b981', '#ecfdf5'],
        cancelada:  ['#6b7280', '#f9fafb'],
      };
      const [color, bg] = map[estado] ?? ['#6b7280', '#f9fafb'];
      const label = estado === 'en_progreso' ? 'En progreso' :
                    estado === 'completada'  ? 'Completada'  :
                    estado === 'cancelada'   ? 'Cancelada'   : 'Pendiente';
      return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;color:${color};background:${bg};border:1px solid ${color}33;">${label}</span>`;
    }

    function prioBadge(prio: string): string {
      const map: Record<string, [string, string]> = {
        alta:  ['#ef4444', '#fef2f2'],
        media: ['#f59e0b', '#fffbeb'],
        baja:  ['#10b981', '#ecfdf5'],
      };
      const [color, bg] = map[prio] ?? ['#6b7280', '#f9fafb'];
      const label = prio === 'alta' ? 'Alta' : prio === 'media' ? 'Media' : 'Baja';
      return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;color:${color};background:${bg};border:1px solid ${color}33;">${label}</span>`;
    }

    function colorDot(color: string): string {
      if (!color) return '—';
      return `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${color};"></span>${color}</span>`;
    }

    // ── Filas de tareas ──
    const filasTareas = tareasRes.rows.map(t => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600;">${t.titulo ?? '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;max-width:220px;">${t.descripcion ? t.descripcion.slice(0, 80) + (t.descripcion.length > 80 ? '…' : '') : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">${estadoBadge(t.estado)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">${prioBadge(t.prioridad)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px;white-space:nowrap;">${fmt(t.fecha_inicio)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px;white-space:nowrap;">${fmt(t.fecha_vencimiento)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px;">${t.hora_inicio ? String(t.hora_inicio).slice(0,5) : '—'}</td>
      </tr>`).join('');

    // ── Filas de proyectos ──
    const filasProyectos = proyectosRes.rows.map(p => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600;">${p.nombre ?? '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">${p.descripcion ? p.descripcion.slice(0, 80) + (p.descripcion.length > 80 ? '…' : '') : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">${estadoBadge(p.estado)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">${colorDot(p.color)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px;white-space:nowrap;">${fmt(p.fecha_creacion)}</td>
      </tr>`).join('');

    // ── Filas de notas ──
    const filasNotas = notasRes.rows.map(n => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600;">${n.nota_titulo ?? 'Sin título'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px;">${n.tarea ?? '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;max-width:260px;">${n.contenido ? n.contenido.slice(0, 100) + (n.contenido.length > 100 ? '…' : '') : '—'}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px;white-space:nowrap;">${fmt(n.fecha_creacion)}</td>
      </tr>`).join('');

    const sinTareas    = `<tr><td colspan="7" style="padding:28px;text-align:center;color:#94a3b8;font-style:italic;">Sin tareas registradas</td></tr>`;
    const sinProyectos = `<tr><td colspan="5" style="padding:28px;text-align:center;color:#94a3b8;font-style:italic;">Sin proyectos registrados</td></tr>`;
    const sinNotas     = `<tr><td colspan="4" style="padding:28px;text-align:center;color:#94a3b8;font-style:italic;">Sin notas registradas</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mis datos — My Agenda</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 32px 24px; background: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
    .page { max-width: 960px; margin: 0 auto; }
    /* Header */
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 20px; padding: 36px 40px; margin-bottom: 28px; color: #fff; }
    .header-top { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .header-logo { width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; }
    .header-brand { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
    .header-sub { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
    .header-meta { display: flex; gap: 32px; flex-wrap: wrap; }
    .header-meta-item { display: flex; flex-direction: column; gap: 2px; }
    .header-meta-label { font-size: 11px; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 0.08em; }
    .header-meta-value { font-size: 15px; font-weight: 700; color: #fff; }
    /* Resumen */
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .summary-card { background: #fff; border-radius: 16px; padding: 22px 24px; border: 1px solid #e2e8f0; text-align: center; }
    .summary-num { font-size: 38px; font-weight: 900; color: #4f46e5; line-height: 1; }
    .summary-label { font-size: 13px; color: #64748b; margin-top: 6px; font-weight: 600; }
    /* Secciones */
    .section { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden; }
    .section-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #fafbfc; }
    .section-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .section-title { font-size: 16px; font-weight: 800; color: #0f172a; }
    .section-count { margin-left: auto; font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 3px 10px; border-radius: 20px; }
    /* Tabla */
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8fafc; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
    tbody tr:hover { background: #fafbff; }
    tbody tr:last-child td { border-bottom: none; }
    /* Footer */
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
    @media print {
      body { background: #fff; padding: 16px; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- CABECERA -->
    <div class="header">
      <div class="header-top">
        <div class="header-logo">📅</div>
        <div>
          <div class="header-brand">My Agenda</div>
          <div class="header-sub">Exportación de datos personales</div>
        </div>
      </div>
      <div class="header-meta">
        <div class="header-meta-item">
          <span class="header-meta-label">Usuario</span>
          <span class="header-meta-value">${sesion.nombre ?? '—'}</span>
        </div>
        <div class="header-meta-item">
          <span class="header-meta-label">Correo</span>
          <span class="header-meta-value">${sesion.email ?? '—'}</span>
        </div>
        <div class="header-meta-item">
          <span class="header-meta-label">Fecha de exportación</span>
          <span class="header-meta-value">${fechaExport}</span>
        </div>
        <div class="header-meta-item">
          <span class="header-meta-label">Hora</span>
          <span class="header-meta-value">${horaExport}</span>
        </div>
      </div>
    </div>

    <!-- RESUMEN -->
    <div class="summary">
      <div class="summary-card">
        <div class="summary-num">${tareasRes.rows.length}</div>
        <div class="summary-label">Tareas</div>
      </div>
      <div class="summary-card">
        <div class="summary-num">${proyectosRes.rows.length}</div>
        <div class="summary-label">Proyectos</div>
      </div>
      <div class="summary-card">
        <div class="summary-num">${notasRes.rows.length}</div>
        <div class="summary-label">Notas</div>
      </div>
    </div>

    <!-- TAREAS -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#eff6ff;">✅</div>
        <span class="section-title">Tareas</span>
        <span class="section-count">${tareasRes.rows.length} registros</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Fecha inicio</th>
              <th>Vencimiento</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>${tareasRes.rows.length ? filasTareas : sinTareas}</tbody>
        </table>
      </div>
    </div>

    <!-- PROYECTOS -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#faf5ff;">📁</div>
        <span class="section-title">Proyectos</span>
        <span class="section-count">${proyectosRes.rows.length} registros</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Color</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>${proyectosRes.rows.length ? filasProyectos : sinProyectos}</tbody>
        </table>
      </div>
    </div>

    <!-- NOTAS -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#fff7ed;">📝</div>
        <span class="section-title">Notas</span>
        <span class="section-count">${notasRes.rows.length} registros</span>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Tarea vinculada</th>
              <th>Contenido</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>${notasRes.rows.length ? filasNotas : sinNotas}</tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      Generado por My Agenda &mdash; ${fechaExport} &mdash; Solo para uso personal
    </div>

  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="Misdatos_MyAgenda_${ahora.toISOString().slice(0,10)}.html"`,
      },
    });

  } catch (err: any) {
    console.error('config-exportar error:', err.message);
    return json({ ok: false, error: 'Error interno del servidor' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
