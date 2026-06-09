export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

// ── Tipos ──────────────────────────────────────────────────────────
interface EstadoChat {
  menu: string;
  datos?: Record<string, any>;
}

// ── Helper respuesta ───────────────────────────────────────────────
function respuesta(texto: string, opciones?: string[], estado?: string, accion?: string) {
  return new Response(
    JSON.stringify({ success: true, texto, opciones: opciones ?? [], estado: estado ?? 'inicio', accion: accion ?? null }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
function error(msg: string) {
  return new Response(
    JSON.stringify({ success: false, texto: msg, opciones: [], estado: 'inicio', accion: null }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// ── Menú principal ─────────────────────────────────────────────────
function menuPrincipal() {
  return respuesta(
    '👋 ¡Hola! Soy **Aria**, tu asistente. ¿Qué deseas hacer?',
    ['📋 Ver mis tareas', '✏️ Crear tarea', '📝 Ver mis notas', '✍️ Crear nota', '📁 Ver archivos', '📊 Resumen general'],
    'inicio'
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    // Usamos body.mensaje original para guardar, y lowercase para comparar
    const mensajeOriginal: string = (body.mensaje ?? '').trim();
    const mensaje = mensajeOriginal.toLowerCase();
    const estado: EstadoChat = body.estado ?? { menu: 'inicio' };
    const datos: Record<string, any> = body.datos ?? {};
    const menu = estado.menu;

    // ══════════════════════════════════════════
    // VOLVER AL MENÚ — siempre tiene prioridad
    // ══════════════════════════════════════════
    if (
      mensaje === 'inicio' ||
      mensaje === 'menu' ||
      mensaje === 'volver' ||
      mensaje.includes('volver al menú') ||
      mensaje.includes('🏠 volver al menú') ||
      mensaje === '🏠'
    ) {
      return menuPrincipal();
    }

    // ══════════════════════════════════════════
    // MENÚ INICIO — primera vez o mensaje libre
    // ══════════════════════════════════════════
    if (menu === 'inicio') {

      // Ver tareas
      if (mensaje.includes('ver mis tareas') || mensaje === '📋 ver mis tareas') {
        const result = await pool.query(
          `SELECT titulo, prioridad, estado, fecha_inicio FROM public.tarea ORDER BY fecha_creacion DESC LIMIT 10`
        );
        if (result.rows.length === 0) {
          return respuesta(
            '📋 No tienes tareas creadas aún.\n\n¿Qué deseas hacer?',
            ['✏️ Crear tarea', '🏠 Volver al menú'],
            'inicio'
          );
        }
        const lista = result.rows.map((t: any, i: number) => {
          const emoji = t.prioridad === 'alta' ? '🔴' : t.prioridad === 'media' ? '🟡' : '🔵';
          const fecha = t.fecha_inicio ? ` · ${new Date(t.fecha_inicio).toLocaleDateString('es-ES')}` : '';
          return `${i + 1}. ${emoji} **${t.titulo}**${fecha} — ${t.estado}`;
        }).join('\n');
        return respuesta(
          `📋 **Tus tareas (${result.rows.length}):**\n\n${lista}\n\n¿Qué deseas hacer?`,
          ['✏️ Crear tarea', '📊 Resumen general', '🏠 Volver al menú'],
          'inicio'
        );
      }

      // Crear tarea — paso 1
      if (mensaje.includes('crear tarea') || mensaje === '✏️ crear tarea') {
        return respuesta(
          '✏️ Vamos a crear una tarea.\n\n¿Cuál es el **título** de la tarea?',
          [],
          'crear_tarea_titulo'
        );
      }

      // Ver notas
      if (mensaje.includes('ver mis notas') || mensaje === '📝 ver mis notas') {
        const result = await pool.query(
          `SELECT n.nota_titulo, n.fecha_creacion, t.titulo AS tarea_titulo
           FROM public.nota n
           LEFT JOIN public.tarea t ON t.id_tarea = n.id_tarea
           WHERE n.deleted_at IS NULL
           ORDER BY n.fecha_creacion DESC LIMIT 10`
        );
        if (result.rows.length === 0) {
          return respuesta(
            '📝 No tienes notas creadas aún.\n\n¿Qué deseas hacer?',
            ['✍️ Crear nota', '🏠 Volver al menú'],
            'inicio'
          );
        }
        const lista = result.rows.map((n: any, i: number) => {
          const tarea = n.tarea_titulo ? ` · 📌 ${n.tarea_titulo}` : '';
          const fecha = new Date(n.fecha_creacion).toLocaleDateString('es-ES');
          return `${i + 1}. 📝 **${n.nota_titulo}**${tarea} — ${fecha}`;
        }).join('\n');
        return respuesta(
          `📝 **Tus notas (${result.rows.length}):**\n\n${lista}\n\n¿Qué deseas hacer?`,
          ['✍️ Crear nota', '🏠 Volver al menú'],
          'inicio'
        );
      }

      // Crear nota — paso 1
      if (mensaje.includes('crear nota') || mensaje === '✍️ crear nota') {
        return respuesta(
          '✍️ Vamos a crear una nota.\n\n¿Cuál es el **título** de la nota?',
          [],
          'crear_nota_titulo'
        );
      }

      // Ver archivos
      if (mensaje.includes('ver archivos') || mensaje === '📁 ver archivos') {
        const result = await pool.query(
          `SELECT a.nombre, a.tipo, a.tamano, a.fecha_subida, t.titulo AS tarea_titulo
           FROM public.archivo a
           LEFT JOIN public.tarea t ON t.id_tarea = a.id_tarea
           WHERE a.deleted_at IS NULL
           ORDER BY a.fecha_subida DESC LIMIT 10`
        );
        if (result.rows.length === 0) {
          return respuesta(
            '📁 No tienes archivos subidos aún.\n\n¿Qué deseas hacer?',
            ['🏠 Volver al menú'],
            'inicio'
          );
        }
        const lista = result.rows.map((a: any, i: number) => {
          const kb = a.tamano ? `${(a.tamano / 1024).toFixed(1)} KB` : '';
          const tarea = a.tarea_titulo ? ` · 📌 ${a.tarea_titulo}` : '';
          return `${i + 1}. 📎 **${a.nombre}** ${kb}${tarea}`;
        }).join('\n');
        return respuesta(
          `📁 **Tus archivos (${result.rows.length}):**\n\n${lista}\n\n¿Qué deseas hacer?`,
          ['🏠 Volver al menú'],
          'inicio'
        );
      }

      // Resumen general
      if (mensaje.includes('resumen') || mensaje === '📊 resumen general') {
        const [t, n, a] = await Promise.all([
          pool.query(`SELECT COUNT(*) AS total, SUM(CASE WHEN prioridad='alta' THEN 1 ELSE 0 END) AS alta, SUM(CASE WHEN estado='pendiente' THEN 1 ELSE 0 END) AS pendientes FROM public.tarea`),
          pool.query(`SELECT COUNT(*) AS total FROM public.nota WHERE deleted_at IS NULL`),
          pool.query(`SELECT COUNT(*) AS total FROM public.archivo WHERE deleted_at IS NULL`),
        ]);
        const tareas     = t.rows[0];
        const totalNotas = n.rows[0].total;
        const totalArch  = a.rows[0].total;
        return respuesta(
          `📊 **Resumen de tu agenda:**\n\n` +
          `📋 Tareas totales: **${tareas.total}**\n` +
          `🔴 Prioridad alta: **${tareas.alta ?? 0}**\n` +
          `⏳ Pendientes: **${tareas.pendientes ?? 0}**\n` +
          `📝 Notas: **${totalNotas}**\n` +
          `📁 Archivos: **${totalArch}**\n\n` +
          `¿Qué deseas hacer?`,
          ['📋 Ver mis tareas', '📝 Ver mis notas', '🏠 Volver al menú'],
          'inicio'
        );
      }

      // Fallback en menú inicio
      return menuPrincipal();
    }

    // ══════════════════════════════════════════
    // FLUJO CREAR TAREA
    // ══════════════════════════════════════════

    // Paso 2: recibir título, pedir prioridad
    if (menu === 'crear_tarea_titulo') {
      if (!mensajeOriginal || mensajeOriginal.length < 2) {
        return respuesta('Por favor escribe un título válido para la tarea.', [], 'crear_tarea_titulo');
      }
      return respuesta(
        `✅ Título: **"${mensajeOriginal}"**\n\n¿Cuál es la **prioridad**?`,
        ['🔴 Alta', '🟡 Media', '🔵 Baja'],
        'crear_tarea_prioridad'
      );
    }

    // Paso 3: recibir prioridad, pedir fecha
    if (menu === 'crear_tarea_prioridad') {
      let prioridad = 'media';
      if (mensaje.includes('alta') || mensaje.includes('🔴')) prioridad = 'alta';
      else if (mensaje.includes('baja') || mensaje.includes('🔵')) prioridad = 'baja';
      return respuesta(
        `✅ Prioridad: **${prioridad}**\n\n¿Quieres asignar una **fecha**? Escríbela en formato DD/MM/AAAA o selecciona:`,
        ['📅 Hoy', '📅 Mañana', '⏭️ Sin fecha'],
        'crear_tarea_fecha'
      );
    }

    // Paso 4: recibir fecha, guardar
    if (menu === 'crear_tarea_fecha') {
      const titulo    = datos.titulo    ?? 'Tarea sin título';
      const prioridad = datos.prioridad ?? 'media';

      let fecha: string | null = null;
      const hoy = new Date();
      if (mensaje.includes('hoy') || mensaje.includes('📅 hoy')) {
        fecha = hoy.toISOString().split('T')[0];
      } else if (mensaje.includes('mañana') || mensaje.includes('📅 mañana')) {
        const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
        fecha = manana.toISOString().split('T')[0];
      } else if (mensaje.includes('sin fecha') || mensaje.includes('⏭️')) {
        fecha = null;
      } else {
        // Intentar parsear DD/MM/AAAA
        const partes = mensajeOriginal.trim().split('/');
        if (partes.length === 3) {
          fecha = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
        }
      }

      try {
        await pool.query(
          `INSERT INTO public.tarea (titulo, descripcion, fecha_inicio, prioridad, estado, fecha_creacion)
           VALUES ($1, '', $2, $3, 'pendiente', NOW())`,
          [titulo, fecha, prioridad]
        );
        return respuesta(
          `🎉 ¡Tarea **"${titulo}"** creada correctamente!\n\n${prioridad === 'alta' ? '🔴' : prioridad === 'media' ? '🟡' : '🔵'} Prioridad: **${prioridad}**${fecha ? `\n📅 Fecha: **${fecha}**` : ''}\n\n¿Qué deseas hacer ahora?`,
          ['📋 Ver mis tareas', '✏️ Crear otra tarea', '🏠 Volver al menú'],
          'inicio',
          'tarea_creada'
        );
      } catch (e: any) {
        console.error('[chatbot] Error creando tarea:', e.message);
        return error('❌ Hubo un error al guardar la tarea. Intenta de nuevo.');
      }
    }

    // ══════════════════════════════════════════
    // FLUJO CREAR NOTA
    // ══════════════════════════════════════════

    // Paso 2: recibir título, pedir contenido
    if (menu === 'crear_nota_titulo') {
      if (!mensajeOriginal || mensajeOriginal.length < 2) {
        return respuesta('Por favor escribe un título válido para la nota.', [], 'crear_nota_titulo');
      }
      return respuesta(
        `✅ Título: **"${mensajeOriginal}"**\n\nAhora escribe el **contenido** de la nota:`,
        [],
        'crear_nota_contenido'
      );
    }

    // Paso 3: recibir contenido, guardar
    if (menu === 'crear_nota_contenido') {
      const titulo   = datos.titulo ?? 'Nota sin título';
      const contenido = mensajeOriginal.trim();
      if (!contenido || contenido.length < 2) {
        return respuesta('Por favor escribe un contenido válido para la nota.', [], 'crear_nota_contenido');
      }
      try {
        await pool.query(
          `INSERT INTO public.nota (id_nota, nota_titulo, contenido, fecha_creacion)
           VALUES (gen_random_uuid(), $1, $2, NOW())`,
          [titulo, contenido]
        );
        return respuesta(
          `🎉 ¡Nota **"${titulo}"** creada correctamente!\n\n¿Qué deseas hacer ahora?`,
          ['📝 Ver mis notas', '✍️ Crear otra nota', '🏠 Volver al menú'],
          'inicio',
          'nota_creada'
        );
      } catch (e: any) {
        console.error('[chatbot] Error creando nota:', e.message);
        return error('❌ Hubo un error al guardar la nota. Intenta de nuevo.');
      }
    }

    // ══════════════════════════════════════════
    // FALLBACK GLOBAL
    // ══════════════════════════════════════════
    return menuPrincipal();

  } catch (err: any) {
    console.error("[POST /api/chatbot]", err.message);
    return new Response(
      JSON.stringify({ success: false, texto: '❌ Error interno. Intenta de nuevo.', opciones: [], estado: 'inicio', accion: null }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};