export const prerender = false;

import type { APIRoute } from "astro";
import { Google } from "arctic";
import { pool } from "../../../../lib/db";
import { crearSesion, cookieSesion } from "../../../../lib/sesion";

// ✅ URL dinámica según entorno — nunca más hardcodeado a localhost
const SITE = import.meta.env.SITE ?? "http://localhost:4321";
const CALLBACK_URL = `${SITE}/api/auth/google/callback`;

const google = new Google(
  import.meta.env.GOOGLE_CLIENT_ID,
  import.meta.env.GOOGLE_CLIENT_SECRET,
  CALLBACK_URL
);

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  try {
    const code           = url.searchParams.get("code");
    const state          = url.searchParams.get("state");
    const storedState    = cookies.get("google_state")?.value;
    const storedVerifier = cookies.get("google_code_verifier")?.value;

    // Limpiar cookies temporales
    cookies.delete("google_state",         { path: "/" });
    cookies.delete("google_code_verifier", { path: "/" });

    if (!code || !state || !storedState || !storedVerifier) {
      return new Response("Parámetros inválidos.", { status: 400 });
    }

    if (state !== storedState) {
      return new Response("State no coincide.", { status: 400 });
    }

    // Intercambiar código por tokens
    const tokens = await google.validateAuthorizationCode(code, storedVerifier);

    // Obtener datos del usuario de Google
    const googleRes  = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.accessToken()}` } }
    );
    const googleUser = await googleRes.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    if (!googleUser.email) {
      return new Response("No se pudo obtener el email de Google.", { status: 400 });
    }

    // Buscar si ya existe el usuario por google_id o email
    let usuario = null;

    const porGoogleId = await pool.query(
      `SELECT * FROM public.usuario WHERE google_id = $1 LIMIT 1`,
      [googleUser.id]
    );

    if (porGoogleId.rows.length > 0) {
      usuario = porGoogleId.rows[0];

      // Actualizar foto si cambió
      await pool.query(
        `UPDATE public.usuario SET foto_perfil = $1 WHERE id_usuario = $2`,
        [googleUser.picture, usuario.id_usuario]
      );
    } else {
      // Buscar por email
      const porEmail = await pool.query(
        `SELECT * FROM public.usuario WHERE email = $1 LIMIT 1`,
        [googleUser.email]
      );

      if (porEmail.rows.length > 0) {
        // Vincular cuenta existente con Google
        usuario = porEmail.rows[0];
        await pool.query(
          `UPDATE public.usuario
           SET google_id        = $1,
               foto_perfil      = $2,
               email_verificado = TRUE
           WHERE id_usuario     = $3`,
          [googleUser.id, googleUser.picture, usuario.id_usuario]
        );
      } else {
        // Crear usuario nuevo
        const nuevo = await pool.query(
          `INSERT INTO public.usuario
             (nombre, email, google_id, foto_perfil, fecha_creacion, email_verificado)
           VALUES ($1, $2, $3, $4, NOW(), TRUE)
           RETURNING *`,
          [googleUser.name, googleUser.email, googleUser.id, googleUser.picture]
        );
        usuario = nuevo.rows[0];
      }
    }

    // Crear sesión
    const token = await crearSesion(usuario.id_usuario);

    // Setear cookie y redirigir al dashboard
    const response = redirect("/dashboard");
    response.headers.append("Set-Cookie", cookieSesion(token));
    return response;

  } catch (error: any) {
    console.error("ERROR GOOGLE CALLBACK:", error.message);
    return redirect("/login?error=google");
  }
};