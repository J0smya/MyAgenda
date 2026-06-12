import { defineMiddleware } from 'astro:middleware';

let schedulerIniciado = false;

export const onRequest = defineMiddleware(async (_ctx, next) => {
  if (!schedulerIniciado) {
    schedulerIniciado = true;
    import('./lib/scheduler')
      .then(({ iniciarScheduler }) => iniciarScheduler())
      .catch((e: any) => console.error('[middleware] Scheduler no cargó:', e.message));
  }
  return next();
});
