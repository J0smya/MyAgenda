import { procesarRecordatorios } from './recordatorio-service';

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
