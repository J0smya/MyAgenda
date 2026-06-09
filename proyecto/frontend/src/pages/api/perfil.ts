// Usamos "Delegación de Eventos" para que no se pierda ningún clic, 
// incluso si Astro carga los elementos de forma dinámica.

document.addEventListener('click', (evento) => {
  // Capturamos el elemento exacto donde el usuario hizo clic
  const target = evento.target as HTMLElement;

  // === 1. ABRIR / CERRAR MENÚ PRINCIPAL ===
  const btnPerfil = target.closest('#perfil-btn');
  const menuPerfil = document.getElementById('perfil-menu');
  
  if (btnPerfil) {
    evento.preventDefault();
    menuPerfil?.classList.toggle('oculto');
    return; // Detenemos la ejecución aquí para que no haga nada más
  }

  // Cerrar el menú si hacemos clic en cualquier otra parte de la pantalla
  if (menuPerfil && !menuPerfil.classList.contains('oculto')) {
    const clickDentroMenu = target.closest('#perfil-menu');
    const clickDentroModal = target.closest('#modal-edicion-perfil');
    
    // Si no hizo clic ni en el menú ni en el modal de edición, lo cerramos
    if (!clickDentroMenu && !clickDentroModal) {
      menuPerfil.classList.add('oculto');
    }
  }

  // === 2. CERRAR SESIÓN ===
  if (target.closest('#btn-cerrar-sesion')) {
    evento.preventDefault();
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      window.location.href = '/'; 
    }
  }

  // === 3. CAMBIAR TEMA (ASPECTO) ===
  const btnTema = target.closest('#btn-tema');
  if (btnTema) {
    evento.preventDefault();
    document.body.classList.toggle('dark-mode');
    
    const textoTema = document.getElementById('texto-tema');
    if (textoTema) {
      if (document.body.classList.contains('dark-mode')) {
        textoTema.textContent = 'Aspecto: Oscuro';
      } else {
        textoTema.textContent = 'Aspecto: Claro';
      }
    }
  }

  // === 4. ABRIR MODAL EDITAR PERFIL ===
  if (target.closest('#btn-editar-perfil')) {
    evento.preventDefault();
    document.getElementById('perfil-menu')?.classList.add('oculto'); // Oculta el menú
    document.getElementById('modal-edicion-perfil')?.classList.remove('hidden'); // Muestra la ventana
  }

  // === 5. CERRAR MODAL EDITAR PERFIL ===
  if (target.closest('#btn-cancelar-perfil')) {
    evento.preventDefault();
    document.getElementById('modal-edicion-perfil')?.classList.add('hidden');
  }
});

// === 6. GUARDAR CAMBIOS DEL FORMULARIO ===
document.addEventListener('submit', (evento) => {
  const form = evento.target as HTMLElement;
  
  // Verificamos que el formulario que se envió es el de editar perfil
  if (form.id === 'form-editar-perfil') {
    evento.preventDefault(); // Evita que la página recargue
    
    const inputNombre = document.getElementById('input-nombre') as HTMLInputElement;
    const nuevoNombre = inputNombre?.value || '';
    
    if (nuevoNombre) {
      const inicial = nuevoNombre.charAt(0).toUpperCase();
      
      const nombreVisual = document.getElementById('nombre-visual');
      const avatarVisual = document.getElementById('avatar-visual');
      const avatarPreview = document.getElementById('avatar-preview-circulo');
      
      // Actualizamos los nombres en la pantalla
      if (nombreVisual) nombreVisual.textContent = nuevoNombre;
      if (avatarVisual) avatarVisual.textContent = inicial;
      if (avatarPreview) avatarPreview.textContent = inicial;
    }
    
    // Cerramos la ventana
    document.getElementById('modal-edicion-perfil')?.classList.add('hidden');
  }
});