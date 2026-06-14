document.addEventListener('DOMContentLoaded', () => {

  // ── DATOS DEL SERVIDOR ────────────────────────────────────────
  const wrapper      = document.querySelector('.config-wrapper') as HTMLElement;
  const nombreInicial = wrapper?.dataset.nombre   ?? '';
  const telefonoActual = wrapper?.dataset.telefono ?? '';

  // ── RASTREA CAMBIOS SIN GUARDAR ───────────────────────────────
  let hayCambiosPendientes = false;
  function marcarCambio() { hayCambiosPendientes = true; }
  function limpiarCambios() { hayCambiosPendientes = false; }

  // ── SEGURIDAD: Volver al Inicio ───────────────────────────────
  const btnVolver = document.getElementById('btn-volver') as HTMLAnchorElement;
  btnVolver?.addEventListener('click', (e) => {
    if (!hayCambiosPendientes) return;
    e.preventDefault();
    mostrarConfirm(
      '¿Salir sin guardar?',
      'Tienes cambios sin guardar. Si sales ahora, se perderán.',
      () => { window.location.href = '/'; },
      { tipo: 'warning', textoOk: 'Salir de todas formas', textoCancel: 'Quedarme aquí' }
    );
  });

  // ── 1. MODO OSCURO ──────────────────────────────────────────
  const btnDarkMode  = document.getElementById('btn-dark-mode')  as HTMLButtonElement;
  const dmToggleRow  = document.getElementById('dm-toggle-row')  as HTMLElement;
  const dmModeLabel  = document.getElementById('dm-mode-label')  as HTMLElement;
  const dmModeDesc   = document.getElementById('dm-mode-desc')   as HTMLElement;
  const dmSunSvg     = document.getElementById('dm-sun-svg')     as HTMLElement;
  const dmMoonSvg    = document.getElementById('dm-moon-svg')    as HTMLElement;
  const dmThumbSun   = document.getElementById('dm-thumb-sun')   as HTMLElement;
  const dmThumbMoon  = document.getElementById('dm-thumb-moon')  as HTMLElement;
  const dmChipLight  = document.getElementById('dm-chip-light')  as HTMLElement;
  const dmChipDark   = document.getElementById('dm-chip-dark')   as HTMLElement;
  const dmCheckLight = document.getElementById('dm-check-light') as HTMLElement;
  const dmCheckDark  = document.getElementById('dm-check-dark')  as HTMLElement;

  let isDark = document.body.classList.contains('dark-mode');

  function applyDarkMode(dark: boolean) {
    if (dark) {
      document.body.classList.add('dark-mode');
      btnDarkMode?.classList.add('active');
      dmToggleRow?.classList.add('dm-dark-active');
      if (dmModeLabel) dmModeLabel.textContent = 'Modo Oscuro';
      if (dmModeDesc)  dmModeDesc.textContent  = 'Interfaz con fondo oscuro activada';
      if (dmSunSvg)    dmSunSvg.style.display  = 'none';
      if (dmMoonSvg)   dmMoonSvg.style.display = '';
      if (dmThumbSun)  dmThumbSun.style.display = 'none';
      if (dmThumbMoon) dmThumbMoon.style.display = '';
      dmChipLight?.classList.remove('active');
      dmChipDark?.classList.add('active');
      if (dmCheckLight) dmCheckLight.style.display = 'none';
      if (dmCheckDark)  dmCheckDark.style.display  = '';
    } else {
      document.body.classList.remove('dark-mode');
      btnDarkMode?.classList.remove('active');
      dmToggleRow?.classList.remove('dm-dark-active');
      if (dmModeLabel) dmModeLabel.textContent = 'Modo Claro';
      if (dmModeDesc)  dmModeDesc.textContent  = 'Activa el modo oscuro para reducir la fatiga visual';
      if (dmSunSvg)    dmSunSvg.style.display  = '';
      if (dmMoonSvg)   dmMoonSvg.style.display = 'none';
      if (dmThumbSun)  dmThumbSun.style.display = '';
      if (dmThumbMoon) dmThumbMoon.style.display = 'none';
      dmChipLight?.classList.add('active');
      dmChipDark?.classList.remove('active');
      if (dmCheckLight) dmCheckLight.style.display = '';
      if (dmCheckDark)  dmCheckDark.style.display  = 'none';
    }
  }

  applyDarkMode(isDark);

  btnDarkMode?.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('conf_darkmode', isDark.toString());
    applyDarkMode(isDark);
    window.dispatchEvent(new Event('darkModeChanged'));
  });

  dmChipLight?.addEventListener('click', () => {
    isDark = false;
    localStorage.setItem('conf_darkmode', 'false');
    applyDarkMode(false);
  });

  dmChipDark?.addEventListener('click', () => {
    isDark = true;
    localStorage.setItem('conf_darkmode', 'true');
    applyDarkMode(true);
  });

  // ── 2. NOTIFICACIONES ───────────────────────────────────────
  const selectAviso = document.getElementById('select-aviso')  as HTMLSelectElement;
  const checkSonido = document.getElementById('check-sonido')  as HTMLInputElement;

  if (localStorage.getItem('conf_aviso') && selectAviso)
    selectAviso.value = localStorage.getItem('conf_aviso')!;
  if (localStorage.getItem('conf_sonido') && checkSonido)
    checkSonido.checked = localStorage.getItem('conf_sonido') === 'true';

  selectAviso?.addEventListener('change', (e) => {
    localStorage.setItem('conf_aviso', (e.target as HTMLSelectElement).value);
    marcarCambio();
    window.dispatchEvent(new Event('configuracionActualizada'));
  });

  checkSonido?.addEventListener('change', (e) => {
    localStorage.setItem('conf_sonido', (e.target as HTMLInputElement).checked.toString());
  });

  // ── 3. EDITAR PERFIL ─────────────────────────────────────────
  const avatarPreview  = document.getElementById('avatar-preview-circulo') as HTMLElement;
  const inputFoto      = document.getElementById('input-foto')             as HTMLInputElement;
  const btnCambiarFoto = document.getElementById('btn-cambiar-foto')       as HTMLButtonElement;
  const inputNombre    = document.getElementById('input-nombre')           as HTMLInputElement;
  const errorNombre    = document.getElementById('error-nombre')           as HTMLElement;

  // Sincronizar localStorage con datos del servidor
  if (nombreInicial) localStorage.setItem('perfil_nombre', nombreInicial);

  inputNombre?.addEventListener('input', () => {
    const val = inputNombre.value.trim();
    if (val.length === 0) {
      inputNombre.classList.add('error');
      errorNombre?.classList.add('visible');
    } else {
      inputNombre.classList.remove('error');
      errorNombre?.classList.remove('visible');
    }
    marcarCambio();
  });

  btnCambiarFoto?.addEventListener('click', () => inputFoto?.click());

  inputFoto?.addEventListener('change', () => {
    const archivo = inputFoto.files?.[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultado = e.target?.result as string;
      avatarPreview.innerHTML = `<img src="${resultado}" alt="foto" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    };
    reader.readAsDataURL(archivo);
    marcarCambio();
  });

  // ── 4. GUARDAR CAMBIOS (DB) ───────────────────────────────────
  const btnGuardar = document.getElementById('btn-guardar-config') as HTMLButtonElement;
  btnGuardar?.addEventListener('click', async () => {
    const nuevoNombre = inputNombre?.value.trim();
    if (!nuevoNombre || nuevoNombre.length === 0) {
      inputNombre?.classList.add('error');
      errorNombre?.classList.add('visible');
      inputNombre?.focus();
      mostrarToast('Nombre requerido', 'El nombre debe tener al menos 1 carácter.', 'error');
      return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';

    try {
      const fd = new FormData();
      fd.append('nombre', nuevoNombre);
      const archivoFoto = inputFoto?.files?.[0];
      if (archivoFoto) fd.append('foto', archivoFoto);

      const res = await fetch('/api/config-guardar', { method: 'POST', body: fd });
      const data = await res.json();

      if (!data.ok) {
        mostrarToast('Error al guardar', data.error ?? 'No se pudo guardar.', 'error');
        return;
      }

      localStorage.setItem('perfil_nombre', nuevoNombre);
      if (data.fotoPerfil) localStorage.setItem('perfil_foto', data.fotoPerfil);

      limpiarCambios();
      mostrarToast('Cambios guardados', 'Tu perfil se actualizó correctamente.', 'success');

    } catch {
      mostrarToast('Sin conexión', 'No se pudo conectar al servidor.', 'error');
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar cambios';
    }
  });

  // ── 5. EXPORTAR DATOS (DB) ────────────────────────────────────
  document.getElementById('btn-exportar')?.addEventListener('click', async () => {
    mostrarToast('Preparando exportación', 'Obteniendo tus datos de la base de datos…', 'info');
    try {
      const res = await fetch('/api/config-exportar');
      if (!res.ok) {
        const err = await res.json();
        mostrarToast('Error al exportar', err.error ?? 'No se pudieron obtener los datos.', 'error');
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Misdatos_MyAgenda_${new Date().toISOString().slice(0,10)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      mostrarToast('Datos exportados', 'El archivo se descargó en tu dispositivo.', 'success');
    } catch {
      mostrarToast('Sin conexión', 'No se pudo conectar al servidor.', 'error');
    }
  });

  // ── 6. BORRAR TAREAS COMPLETADAS (DB) ────────────────────────
  document.getElementById('btn-borrar-todo')?.addEventListener('click', () => {
    mostrarConfirm(
      'Eliminar tareas completadas',
      'Esta acción eliminará permanentemente todas tus tareas completadas. Esta operación no se puede deshacer.',
      async () => {
        try {
          const res  = await fetch('/api/config-borrar', { method: 'POST' });
          const data = await res.json();
          if (!data.ok) {
            mostrarToast('Error', data.error ?? 'No se pudieron eliminar.', 'error');
            return;
          }
          const n = data.eliminadas ?? 0;
          mostrarToast(
            'Tareas eliminadas',
            n > 0
              ? `Se eliminaron ${n} tarea${n !== 1 ? 's' : ''} completada${n !== 1 ? 's' : ''}.`
              : 'No había tareas completadas para eliminar.',
            'success'
          );
        } catch {
          mostrarToast('Sin conexión', 'No se pudo conectar al servidor.', 'error');
        }
      },
      { tipo: 'danger', textoOk: 'Sí, eliminar', textoCancel: 'Cancelar' }
    );
  });

  // ── 7. CAMBIAR TELÉFONO ───────────────────────────────────────
  const modalTelefono = document.getElementById('modal-telefono')    as HTMLElement;
  const telPaso1      = document.getElementById('tel-paso-1')        as HTMLElement;
  const telPaso2      = document.getElementById('tel-paso-2')        as HTMLElement;
  const inputNuevoTel = document.getElementById('input-nuevo-tel')   as HTMLInputElement;
  const errorNuevoTel = document.getElementById('error-nuevo-tel')   as HTMLElement;
  const btnTelEnviar  = document.getElementById('btn-tel-enviar')    as HTMLButtonElement;
  const btnTelCancel  = document.getElementById('btn-tel-cancelar')  as HTMLButtonElement;
  const telPaso2Num   = document.getElementById('tel-paso2-num')     as HTMLElement;
  const errorOtp      = document.getElementById('error-otp')        as HTMLElement;
  const errorOtpMsg   = document.getElementById('error-otp-msg')    as HTMLElement;
  const btnOtpVolver  = document.getElementById('btn-otp-volver')   as HTMLButtonElement;
  const btnOtpVerif   = document.getElementById('btn-otp-verificar') as HTMLButtonElement;
  const otpBoxes      = document.getElementById('otp-boxes')        as HTMLElement;
  const otpTimerEl    = document.getElementById('otp-timer')        as HTMLElement;
  const otpSeconds    = document.getElementById('otp-seconds')      as HTMLElement;
  const btnReenviar   = document.getElementById('btn-reenviar-otp') as HTMLButtonElement;

  let telefonoPendiente = '';
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  function abrirModalTelefono() {
    telPaso1.style.display = '';
    telPaso2.style.display = 'none';
    inputNuevoTel.value = '';
    errorNuevoTel.classList.remove('visible');
    modalTelefono.style.display = 'flex';
    setTimeout(() => inputNuevoTel.focus(), 80);
  }

  function cerrarModalTelefono() {
    modalTelefono.style.display = 'none';
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  document.getElementById('btn-cambiar-telefono')?.addEventListener('click', abrirModalTelefono);
  btnTelCancel?.addEventListener('click', cerrarModalTelefono);
  modalTelefono?.addEventListener('click', (e) => { if (e.target === modalTelefono) cerrarModalTelefono(); });

  // Construir cajas OTP (6 dígitos)
  function buildOtpBoxes() {
    otpBoxes.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const inp = document.createElement('input');
      inp.type         = 'text';
      inp.maxLength    = 1;
      inp.inputMode    = 'numeric';
      inp.className    = 'otp-box';
      inp.dataset.idx  = String(i);
      inp.addEventListener('input', (e) => {
        const el = e.target as HTMLInputElement;
        el.value = el.value.replace(/\D/g, '');
        if (el.value && i < 5) {
          (otpBoxes.children[i + 1] as HTMLInputElement)?.focus();
        }
        errorOtp.classList.remove('visible');
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value && i > 0) {
          (otpBoxes.children[i - 1] as HTMLInputElement)?.focus();
        }
      });
      inp.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
        [...text].forEach((ch, idx) => {
          const box = otpBoxes.children[idx] as HTMLInputElement;
          if (box) box.value = ch;
        });
        (otpBoxes.children[Math.min(text.length, 5)] as HTMLInputElement)?.focus();
      });
      otpBoxes.appendChild(inp);
    }
  }

  function getOtpValue() {
    return [...otpBoxes.children].map(el => (el as HTMLInputElement).value).join('');
  }

  function iniciarTimer(segundos = 60) {
    let restante = segundos;
    if (otpSeconds) otpSeconds.textContent = String(restante);
    otpTimerEl?.style && (otpTimerEl.style.display = '');
    if (btnReenviar) btnReenviar.disabled = true;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      restante--;
      if (otpSeconds) otpSeconds.textContent = String(restante);
      if (restante <= 0) {
        clearInterval(timerInterval!);
        timerInterval = null;
        otpTimerEl?.style && (otpTimerEl.style.display = 'none');
        if (btnReenviar) btnReenviar.disabled = false;
      }
    }, 1000);
  }

  // Paso 1: enviar OTP
  async function enviarOtp(telefono: string) {
    btnTelEnviar.disabled = true;
    btnTelEnviar.textContent = 'Enviando…';
    try {
      const res  = await fetch('/api/config-telefono', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ accion: 'solicitar', telefono }),
      });
      const data = await res.json();
      if (!data.ok) {
        errorNuevoTel.querySelector('span') && (errorNuevoTel.querySelector('span')!.textContent = data.error);
        errorNuevoTel.classList.add('visible');
        return;
      }
      telefonoPendiente = telefono;
      if (telPaso2Num) telPaso2Num.textContent = telefono;
      telPaso1.style.display = 'none';
      telPaso2.style.display = '';
      buildOtpBoxes();
      iniciarTimer(60);
      setTimeout(() => (otpBoxes.children[0] as HTMLInputElement)?.focus(), 80);
    } catch {
      mostrarToast('Sin conexión', 'No se pudo conectar al servidor.', 'error');
    } finally {
      btnTelEnviar.disabled = false;
      btnTelEnviar.textContent = 'Enviar código';
    }
  }

  btnTelEnviar?.addEventListener('click', () => {
    const tel = inputNuevoTel?.value.trim();
    const numericOnly = tel.replace(/\D/g, '');
    if (!tel || numericOnly.length < 7) {
      errorNuevoTel.classList.add('visible');
      inputNuevoTel?.focus();
      return;
    }
    errorNuevoTel.classList.remove('visible');
    enviarOtp(tel);
  });

  inputNuevoTel?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnTelEnviar?.click();
  });

  // Reenviar OTP
  btnReenviar?.addEventListener('click', () => {
    if (telefonoPendiente) enviarOtp(telefonoPendiente);
  });

  // Volver al paso 1
  btnOtpVolver?.addEventListener('click', () => {
    telPaso2.style.display = 'none';
    telPaso1.style.display = '';
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    errorOtp.classList.remove('visible');
  });

  // Paso 2: verificar OTP
  btnOtpVerif?.addEventListener('click', async () => {
    const codigo = getOtpValue();
    if (codigo.length !== 6) {
      if (errorOtpMsg) errorOtpMsg.textContent = 'Ingresa los 6 dígitos del código.';
      errorOtp.classList.add('visible');
      return;
    }
    btnOtpVerif.disabled = true;
    btnOtpVerif.textContent = 'Verificando…';
    try {
      const res  = await fetch('/api/config-telefono', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ accion: 'verificar', codigo, telefono: telefonoPendiente }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (errorOtpMsg) errorOtpMsg.textContent = data.error ?? 'Código incorrecto.';
        errorOtp.classList.add('visible');
        return;
      }
      cerrarModalTelefono();
      // Actualizar campo visible
      const dispEl = document.getElementById('input-telefono-actual') as HTMLInputElement;
      if (dispEl) dispEl.value = telefonoPendiente;
      mostrarToast('Teléfono actualizado', `Número ${telefonoPendiente} verificado y guardado.`, 'success');
    } catch {
      mostrarToast('Sin conexión', 'No se pudo conectar al servidor.', 'error');
    } finally {
      btnOtpVerif.disabled = false;
      btnOtpVerif.textContent = 'Verificar y guardar';
    }
  });

  // ── TOAST ─────────────────────────────────────────────────────
  let toastContainer = document.getElementById('config-toast-container') as HTMLElement;
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id        = 'config-toast-container';
    toastContainer.className = 'config-toast-container';
    document.body.appendChild(toastContainer);
  }

  type ToastTipo = 'success' | 'error' | 'info' | 'warning';

  function mostrarToast(titulo: string, subtitulo: string, tipo: ToastTipo = 'success') {
    const claseExtra =
      tipo === 'error'   ? ' config-toast--error'   :
      tipo === 'warning' ? ' config-toast--warning'  :
      tipo === 'info'    ? ' config-toast--info'     : '';

    const iconSvg =
      tipo === 'error' || tipo === 'warning'
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        : tipo === 'info'
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    const toast = document.createElement('div');
    toast.className = `config-toast${claseExtra}`;
    toast.innerHTML = `
      <div class="config-toast-icon">${iconSvg}</div>
      <div class="config-toast-body">
        <div class="config-toast-title">${titulo}</div>
        <div class="config-toast-sub">${subtitulo}</div>
      </div>
      <button class="config-toast-close" title="Cerrar">✕</button>
    `;
    toast.querySelector('.config-toast-close')?.addEventListener('click', () => cerrarToast(toast));
    toastContainer.appendChild(toast);
    setTimeout(() => cerrarToast(toast), 4000);
  }

  function cerrarToast(toast: HTMLElement) {
    toast.classList.add('config-toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  // ── CONFIRM ───────────────────────────────────────────────────
  type ConfirmOpts = {
    tipo?: 'danger' | 'warning' | 'info';
    textoOk?: string;
    textoCancel?: string;
  };

  function mostrarConfirm(
    titulo: string,
    descripcion: string,
    onConfirm: () => void,
    opts: ConfirmOpts = {}
  ) {
    const tipo       = opts.tipo       ?? 'danger';
    const textoOk    = opts.textoOk    ?? 'Confirmar';
    const textoCancel = opts.textoCancel ?? 'Cancelar';

    const iconColor  = tipo === 'danger'  ? '#ef4444' : tipo === 'warning' ? '#f59e0b' : '#0ea5e9';
    const iconBg     = tipo === 'danger'  ? '#fef2f2' : tipo === 'warning' ? '#fffbeb' : '#f0f9ff';
    const okClass    = tipo === 'danger'  ? 'config-confirm-ok'
                     : tipo === 'warning' ? 'config-confirm-ok config-confirm-ok--warning'
                     : 'config-confirm-ok config-confirm-ok--blue';

    const iconSvg = tipo === 'danger'
      ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`
      : tipo === 'warning'
      ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const overlay = document.createElement('div');
    overlay.className = 'config-confirm-overlay';
    overlay.innerHTML = `
      <div class="config-confirm-box">
        <div class="config-confirm-icon" style="background:${iconBg};color:${iconColor}">${iconSvg}</div>
        <div class="config-confirm-title">${titulo}</div>
        <div class="config-confirm-desc">${descripcion}</div>
        <div class="config-confirm-actions">
          <button class="config-confirm-cancel">${textoCancel}</button>
          <button class="${okClass}">${textoOk}</button>
        </div>
      </div>
    `;
    overlay.querySelector('.config-confirm-cancel')
      ?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('.config-confirm-ok, .config-confirm-ok--blue, .config-confirm-ok--warning')
      ?.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // Exponer globalmente para páginas que importen este script
  (window as any).mostrarToast   = mostrarToast;
  (window as any).mostrarConfirm = mostrarConfirm;
});

