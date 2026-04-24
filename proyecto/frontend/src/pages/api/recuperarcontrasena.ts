import type { APIRoute } from 'astro';
import pg from 'pg';
import bcrypt from 'bcryptjs';

// Configuración PostgreSQL (Revisa tu contraseña y nombre de bd aquí)
const pool = new pg.Pool({
  user: 'postgres',
  password: 'tu_password', // <--- CAMBIAR POR TU CLAVE
  host: 'localhost',
  port: 5432,
  database: 'myagenda',    // <--- CAMBIAR POR TU BASE DE DATOS
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { accion, email, codigo, nuevaContrasena } = await request.json();

    if (accion === 'enviar_codigo') {
      const res = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
      if (res.rowCount === 0) return new Response(JSON.stringify({ error: 'Correo no registrado' }), { status: 404 });
      return new Response(JSON.stringify({ mensaje: 'Código enviado' }), { status: 200 });
    }

    if (accion === 'verificar_codigo') {
      if (codigo === '123456') return new Response(JSON.stringify({ mensaje: 'Válido' }), { status: 200 });
      return new Response(JSON.stringify({ error: 'Código incorrecto' }), { status: 400 });
    }

    if (accion === 'actualizar_contrasena') {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(nuevaContrasena, salt);
      const update = await pool.query('UPDATE usuarios SET contrasena = $1 WHERE email = $2', [hash, email]);
      
      if (update.rowCount && update.rowCount > 0) return new Response(JSON.stringify({ mensaje: 'Actualizada' }), { status: 200 });
      return new Response(JSON.stringify({ error: 'Error al actualizar' }), { status: 500 });
    }

    return new Response(JSON.stringify({ error: 'Acción inválida' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error de servidor' }), { status: 500 });
  }
};