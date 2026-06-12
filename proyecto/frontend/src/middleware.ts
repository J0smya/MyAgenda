import { defineMiddleware } from 'astro:middleware';
import { iniciarScheduler } from './lib/scheduler';

export const onRequest = defineMiddleware(async (_ctx, next) => {
  iniciarScheduler();
  return next();
});
