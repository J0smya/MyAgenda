document.addEventListener('DOMContentLoaded', () => {
  // Elementos del Menú Popover
  const triggerBtn = document.getElementById('profile-trigger') as HTMLElement;
  const popover = document.getElementById('profile-popover') as HTMLElement;
  
  // Botones de acción del menú
  const btnEditProfile = document.getElementById('btn-edit-profile') as HTMLElement;
  const btnPendingTasks = document.getElementById('btn-pending-tasks') as HTMLElement; // NUEVO
  const btnSwitchAccount = document.getElementById('btn-switch-account') as HTMLElement;
  const btnLogout = document.getElementById('btn-logout') as HTMLElement;

  // Elementos del Modal de Edición
  const modalEditar = document.getElementById('modal-editar-perfil') as HTMLElement;
  const btnCancelarModal = document.getElementById('ep-btn-cancelar') as HTMLElement;
  const formEditar = document.getElementById('form-editar-perfil') as HTMLFormElement;
  const inputNombre = document.getElementById('ep-input-nombre') as HTMLInputElement;
  const inputFoto = document.getElementById('ep-input-foto') as HTMLInputElement;

  // Elementos del Modal de Tareas Pendientes
  const modalTareas = document.getElementById('modal-tareas-pendientes') as HTMLElement;
  const btnCerrarTareas = document.getElementById('tp-btn-cerrar') as HTMLElement;

  // Elementos a actualizar visualmente
  const displayUserName = document.getElementById('display-user-name') as HTMLElement;
  const profilePhoto = document.getElementById('profile-photo') as HTMLImageElement;
  const popoverPhoto = document.getElementById('popover-photo') as HTMLImageElement;

  /* ==============================================================
     1. LÓGICA DEL MENÚ POPOVER (ABRIR / CERRAR)
     ============================================================== */
  if (triggerBtn && popover) {
    triggerBtn.addEventListener('click', (e: Event) => {
      e.stopPropagation(); 
      popover.classList.toggle('hidden');
    });

    document.addEventListener('click', (e: Event) => {
      const targetNode = e.target as Node;
      // Ignorar el clic si se hizo dentro de alguno de los modales
      const isInModalEditar = modalEditar && modalEditar.contains(targetNode);
      const isInModalTareas = modalTareas && modalTareas.contains(targetNode);

      if (!popover.classList.contains('hidden') && 
          !popover.contains(targetNode) && 
          !triggerBtn.contains(targetNode) &&
          !isInModalEditar && 
          !isInModalTareas) {
        popover.classList.add('hidden');
      }
    });
  }

  /* ==============================================================
     2. LÓGICA DE LOS BOTONES DEL MENÚ
     ============================================================== */
  
  // A. Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => { window.location.href = 'http://localhost:4321'; });
  }

  // B. Cambiar de cuenta
  if (btnSwitchAccount) {
    btnSwitchAccount.addEventListener('click', () => {
      popover.classList.add('hidden');
      alert("Selector de cuentas en desarrollo...");
    });
  }

  // C. Abrir Editar Perfil
  if (btnEditProfile && modalEditar) {
    btnEditProfile.addEventListener('click', () => {
      popover.classList.add('hidden');
      modalEditar.classList.remove('hidden');
    });
  }

  // D. Abrir Tareas Pendientes (NUEVO)
  if (btnPendingTasks && modalTareas) {
    btnPendingTasks.addEventListener('click', () => {
      popover.classList.add('hidden');
      modalTareas.classList.remove('hidden');
    });
  }

  /* ==============================================================
     3. LÓGICA DE LOS MODALES (GUARDAR / CERRAR)
     ============================================================== */
  
  // Cerrar Modal Tareas
  if (btnCerrarTareas && modalTareas) {
    btnCerrarTareas.addEventListener('click', () => { modalTareas.classList.add('hidden'); });
  }

  // Cerrar Modal Edición
  if (btnCancelarModal && modalEditar) {
    btnCancelarModal.addEventListener('click', () => { modalEditar.classList.add('hidden'); });
  }

  // Guardar Cambios del Perfil
  if (formEditar && displayUserName && profilePhoto && popoverPhoto) {
    formEditar.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      
      const nuevoNombre = inputNombre.value.trim();
      if (nuevoNombre !== '') displayUserName.textContent = nuevoNombre;

      if (inputFoto.files && inputFoto.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evento) {
          const nuevaImagenUrl = evento.target?.result as string;
          profilePhoto.src = nuevaImagenUrl;
          popoverPhoto.src = nuevaImagenUrl;
        };
        reader.readAsDataURL(inputFoto.files[0]);
      }

      modalEditar.classList.add('hidden');
      inputFoto.value = ''; 
    });
  }
});