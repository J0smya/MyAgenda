import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Definimos las cabeceras base
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*"); // Temporalmente * para probar
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-KEY");

  // 2. Si es una petición OPTIONS (pre-flight), respondemos de inmediato
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: headers,
    });
  }

  // 3. Ejecutamos la petición y le añadimos nuestras cabeceras
  const response = await next();
  
  // Clonamos la respuesta para poder modificar los headers
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-KEY");

  return newResponse;
});