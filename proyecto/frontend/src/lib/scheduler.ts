import { procesarRecordatorios } from './recordatorio-service';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carga explícita del .env en process.env como garantía (Vite no siempre lo inyecta en SSR)
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines   = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch {}

let iniciado = false;

export function iniciarScheduler() {
  if (iniciado) return;
  iniciado = true;

  console.log('[scheduler] Iniciado — revisará recordatorios cada 60 s');

  // Primera ejecución inmediata al arrancar
  procesarRecordatorios().catch((e: any) =>
    console.error('[scheduler] Error inicial:', e.message)
  );

  setInterval(async () => {
    try {
      const n = await procesarRecordatorios();
      if (n > 0) console.log(`[scheduler] ${n} recordatorio(s) enviado(s)`);
    } catch (e: any) {
      console.error('[scheduler] Error en tick:', e.message);
    }
  }, 60_000);
}
