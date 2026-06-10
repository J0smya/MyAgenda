document.addEventListener('DOMContentLoaded', () => {

  // CARGAR avatar y nombre guardados
  const avatarVisual = document.getElementById('avatar-visual') as HTMLElement;
  const nombreVisual = document.getElementById('nombre-visual') as HTMLElement;

  const fotoGuardada = localStorage.getItem('perfil_foto');
  const nombreGuardado = localStorage.getItem('perfil_nombre');

  if (avatarVisual) {
    if (fotoGuardada) {
      avatarVisual.style.backgroundImage = `url(${fotoGuardada})`;
      avatarVisual.style.backgroundSize = 'cover';
      avatarVisual.style.backgroundPosition = 'center';
      avatarVisual.textContent = '';
    } else {
      avatarVisual.textContent = nombreGuardado ? nombreGuardado.charAt(0).toUpperCase() : 'A';
    }
  }

  if (nombreVisual && nombreGuardado) {
    nombreVisual.textContent = nombreGuardado;
  }

  // CLICKS
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