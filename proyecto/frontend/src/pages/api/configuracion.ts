document.addEventListener('DOMContentLoaded', () => {

  // ── 1. PREFERENCIAS ──────────────────────────────────────────
  const selectVista  = document.getElementById('select-vista')  as HTMLSelectElement;
  const selectAviso  = document.getElementById('select-aviso')  as HTMLSelectElement;
  const checkSonido  = document.getElementById('check-sonido')  as HTMLInputElement;

  if (localStorage.getItem('conf_vista'))  selectVista.value   = localStorage.getItem('conf_vista')!;
  if (localStorage.getItem('conf_aviso'))  selectAviso.value   = localStorage.getItem('conf_aviso')!;
  if (localStorage.getItem('conf_sonido')) checkSonido.checked = localStorage.getItem('conf_sonido') === 'true';

  // 🔴 AQUÍ ESTÁ EL CAMBIO CLAVE: Agregamos el dispatchEvent al cambiar la vista
  selectVista?.addEventListener('change',  (e) => {
    localStorage.setItem('conf_vista',  (e.target as HTMLSelectElement).value);
    // Avisamos al resto de la aplicación (al dashboard) que la configuración cambió
    window.dispatchEvent(new Event('configuracionActualizada'));
  });

  selectAviso?.addEventListener('change',  (e) => {
    localStorage.setItem('conf_aviso',  (e.target as HTMLSelectElement).value);
    window.dispatchEvent(new Event('configuracionActualizada'));
  });

  checkSonido?.addEventListener('change',  (e) => {
    localStorage.setItem('conf_sonido', (e.target as HTMLInputElement).checked.toString());
  });

  // ── 2. EDITAR PERFIL ─────────────────────────────────────────
  const avatarPreview  = document.getElementById('avatar-preview-circulo') as HTMLElement;
  const inputFoto      = document.getElementById('input-foto')             as HTMLInputElement;
  const btnCambiarFoto = document.getElementById('btn-cambiar-foto')       as HTMLButtonElement;
  const inputNombre    = document.getElementById('input-nombre')           as HTMLInputElement;
  const errorNombre    = document.getElementById('error-nombre')           as HTMLElement;

  const fotoGuardada   = localStorage.getItem('perfil_foto');
  const nombreGuardado = localStorage.getItem('perfil_nombre');

  if (avatarPreview) {
    if (fotoGuardada) {
      avatarPreview.style.backgroundImage    = `url(${fotoGuardada})`;
      avatarPreview.style.backgroundSize     = 'cover';
      avatarPreview.style.backgroundPosition = 'center';
      avatarPreview.textContent = '';
    } else {
      avatarPreview.textContent = nombreGuardado ? nombreGuardado.charAt(0).toUpperCase() : 'A';
    }
  }

  if (inputNombre && nombreGuardado) inputNombre.value = nombreGuardado;

  inputNombre?.addEventListener('input', () => {
    const val = inputNombre.value.trim();
    if (val.length === 0) {
      inputNombre.classList.add('error');
      errorNombre.classList.add('visible');
    } else {
      inputNombre.classList.remove('error');
      errorNombre.classList.remove('visible');
    }
  });

  btnCambiarFoto?.addEventListener('click', () => inputFoto?.click());

  inputFoto?.addEventListener('change', () => {
    const archivo = inputFoto.files?.[0];
    if (!archivo) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultado = e.target?.result as string;
      avatarPreview.style.backgroundImage    = `url(${resultado})`;
      avatarPreview.style.backgroundSize     = 'cover';
      avatarPreview.style.backgroundPosition = 'center';
      avatarPreview.textContent = '';
    };
    reader.readAsDataURL(archivo);
  });

  // ── 3. GUARDAR CAMBIOS ────────────────────────────────────────
  const btnGuardar = document.getElementById('btn-guardar-config');
  btnGuardar?.addEventListener('click', () => {
    const nuevoNombre = inputNombre?.value.trim();
    if (!nuevoNombre || nuevoNombre.length === 0) {
      inputNombre.classList.add('error');
      errorNombre.classList.add('visible');
      inputNombre.focus();
      mostrarToast('Nombre requerido', 'El nombre debe tener al menos 1 carácter.', true);
      return;
    }
    localStorage.setItem('perfil_nombre', nuevoNombre);
    const archivo = inputFoto?.files?.[0];
    if (archivo) {
      const reader = new FileReader();
      reader.onload = (e) => {
        localStorage.setItem('perfil_foto', e.target?.result as string);
        mostrarToast('Perfil actualizado', 'Los cambios han sido guardados correctamente.');
      };
      reader.readAsDataURL(archivo);
    } else {
      mostrarToast('Cambios guardados', 'La configuración se guardó correctamente.');
    }
  });

  // ── 4. EXPORTAR ───────────────────────────────────────────────
  document.getElementById('btn-exportar')?.addEventListener('click', () => {
    const datos = {
      usuario: localStorage.getItem('perfil_nombre') || 'Alex Sebastian Saldaña Palomino',
      exportadoEl: new Date().toISOString(),
      tareasActivas: 5,
      notas: 12
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(datos, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'Mis_Datos_MyAgenda.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
    mostrarToast('Datos exportados', 'El archivo se descargó en tu dispositivo.');
  });

  // ── 5. BORRAR TAREAS ──────────────────────────────────────────
  document.getElementById('btn-borrar-todo')?.addEventListener('click', () => {
    mostrarConfirm(
      'Eliminar tareas completadas',
      'Esta acción eliminará permanentemente todas tus tareas completadas. No se puede deshacer.',
      () => { mostrarToast('Tareas eliminadas', 'Todas las tareas completadas han sido removidas.'); }
    );
  });

  // ── TOAST ─────────────────────────────────────────────────────
  let toastContainer = document.getElementById('config-toast-container') as HTMLElement;
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'config-toast-container';
    toastContainer.className = 'config-toast-container';
    document.body.appendChild(toastContainer);
  }

  function mostrarToast(titulo: string, subtitulo: string, esError = false) {
    const toast = document.createElement('div');
    toast.className = `config-toast${esError ? ' config-toast--error' : ''}`;
    const iconSvg = esError
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    toast.innerHTML = `
      <div class="config-toast-icon">${iconSvg}</div>
      <div class="config-toast-body">
        <div class="config-toast-title">${titulo}</div>
        <div class="config-toast-sub">${subtitulo}</div>
      </div>
      <button class="config-toast-close" title="Cerrar">✕</button>
    `;
    toast.querySelector('.config-toast-close')?.addEventListener('click', () => cerrarToast(toast));
    toast.addEventListener('click', () => cerrarToast(toast));
    toastContainer.appendChild(toast);
    setTimeout(() => cerrarToast(toast), 3500);
  }

  function cerrarToast(toast: HTMLElement) {
    toast.classList.add('config-toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  // ── CONFIRM ───────────────────────────────────────────────────
  function mostrarConfirm(titulo: string, descripcion: string, onConfirm: () => void) {
    const overlay = document.createElement('div');
    overlay.className = 'config-confirm-overlay';
    overlay.innerHTML = `
      <div class="config-confirm-box">
        <div class="config-confirm-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <div class="config-confirm-title">${titulo}</div>
        <div class="config-confirm-desc">${descripcion}</div>
        <div class="config-confirm-actions">
          <button class="config-confirm-cancel">Cancelar</button>
          <button class="config-confirm-ok">Confirmar</button>
        </div>
      </div>
    `;
    overlay.querySelector('.config-confirm-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('.config-confirm-ok')?.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
});