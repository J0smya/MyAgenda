import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Obtener la respuesta original
  const response = await next();

  // 2. Configurar CORS (ajusta el origen a tu dominio real por seguridad)
  response.headers.set("Access-Control-Allow-Origin", "*"); 
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-KEY");

  // 3. Manejar el método OPTIONS (Pre-flight request)
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
});