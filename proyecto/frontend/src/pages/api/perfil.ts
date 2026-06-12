document.addEventListener('DOMContentLoaded', () => {

  const avatarVisual = document.getElementById('avatar-visual') as HTMLElement;
  const nombreVisual = document.getElementById('nombre-visual') as HTMLElement;
  const wrapper      = document.querySelector('.perfil-wrapper') as HTMLElement;

  // Cargar desde el servidor (data attributes) — fuente de verdad por usuario
  const nombreServidor = wrapper?.dataset.nombre ?? '';
  const fotoServidor   = wrapper?.dataset.foto   ?? '';

  // Sincronizar localStorage con datos reales del usuario autenticado
  if (nombreServidor) localStorage.setItem('perfil_nombre', nombreServidor);
  if (fotoServidor)   localStorage.setItem('perfil_foto',   fotoServidor);
  else                localStorage.removeItem('perfil_foto');

  if (avatarVisual) {
    if (fotoServidor) {
      avatarVisual.style.backgroundImage    = `url(${fotoServidor})`;
      avatarVisual.style.backgroundSize     = 'cover';
      avatarVisual.style.backgroundPosition = 'center';
      avatarVisual.textContent = '';
    } else {
      avatarVisual.textContent = nombreServidor ? nombreServidor.charAt(0).toUpperCase() : 'A';
    }
  }

  if (nombreVisual && nombreServidor) {
    nombreVisual.textContent = nombreServidor;
  }

  function limpiarSesionLocal() {
    localStorage.removeItem('perfil_foto');
    localStorage.removeItem('perfil_nombre');
  }

  // Botón confirmar cambio de cuenta
  document.getElementById('btn-confirmar-cambio')?.addEventListener('click', () => {
    limpiarSesionLocal();
    window.location.href = '/login';
  });

  // Botón confirmar cerrar sesión
  document.getElementById('btn-confirmar-cerrar')?.addEventListener('click', () => {
    limpiarSesionLocal();
    window.location.href = '/';
  });

  // CLICKS generales
  document.addEventListener('click', (evento) => {
    const target = evento.target as HTMLElement;

    if (!target.closest('#perfil-menu') && !target.closest('#perfil-btn') && !target.closest('.modal-overlay')) {
      document.getElementById('perfil-menu')?.classList.add('oculto');
    }

    if (target.closest('#perfil-btn')) {
      document.getElementById('perfil-menu')?.classList.toggle('oculto');
    }

    if (target.closest('#btn-cambiar-cuenta')) {
      document.getElementById('perfil-menu')?.classList.add('oculto');
      document.getElementById('modal-cambiar-cuenta')?.classList.remove('hidden');
    }

    if (target.closest('#btn-cerrar-sesion')) {
      document.getElementById('perfil-menu')?.classList.add('oculto');
      document.getElementById('modal-cerrar-sesion')?.classList.remove('hidden');
    }

    if (target.closest('#btn-configuracion')) {
      window.location.href = '/configuracion';
    }
  });

});