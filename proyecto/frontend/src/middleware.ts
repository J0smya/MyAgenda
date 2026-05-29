import { defineMiddleware } from "astro:middleware";
import { obtenerSesion, obtenerTokenDeCookie } from "./lib/sesion";

const RUTAS_PROTEGIDAS  = ["/dashboard"];
const RUTAS_PUBLICAS    = ["/login", "/registro", "/api/auth/google", "/api/auth/google/callback", "/api/registro"];

export const onRequest = defineMiddleware(async ({ request, locals, redirect }, next) => {
  const url    = new URL(request.url);
  const path   = url.pathname;
  const token  = obtenerTokenDeCookie(request.headers.get("cookie"));

  let usuario = null;
  if (token) {
    try { usuario = await obtenerSesion(token); } catch {}
  }

  // Si está en ruta protegida sin sesión → login
  const estaProtegida = RUTAS_PROTEGIDAS.some(r => path.startsWith(r));
  if (estaProtegida && !usuario) {
    return redirect("/login");
  }

  // Si ya tiene sesión y va a login/registro → dashboard
  const esPublica = RUTAS_PUBLICAS.some(r => path.startsWith(r));
  if (esPublica && usuario && (path === "/login" || path === "/registro")) {
    return redirect("/dashboard");
  }

  // Pasar usuario a todas las páginas
  (locals as any).usuario = usuario;

  return next();
});