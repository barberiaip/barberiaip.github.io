// admin/js/handlers.js
import Storage from '../../core/storage.js';

// --- FUNCIONES CORE ---

async function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    
    if (id === 'modal-nuevo-turno') {
        // 1. Cargar Clientes
        const selectClientes = document.getElementById('m-cliente-existente');
        const clientes = await Storage.getClientes();
        selectClientes.innerHTML = '<option value="">-- Seleccionar cliente (opcional) --</option>' + 
            clientes.map(c => `<option value="${c.id}">${c.nombre} ${c.apellido || ''}</option>`).join('');

        // 2. Cargar Servicios (ESTO ES LO QUE FALTA)
        const selectServicios = document.getElementById('m-servicio');
        const servicios = await Storage.getServicios();
        selectServicios.innerHTML = '<option value="">-- Seleccionar servicio --</option>' + 
            servicios.map(s => `<option value="${s.id}">${s.nombre} ($${s.precio})</option>`).join('');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
    if (id === 'modal-nuevo-turno') limpiarFormularioTurno();
}

function limpiarFormularioTurno() {
    const modal = document.getElementById('modal-nuevo-turno');
    if (!modal) return;
    delete modal.dataset.editingId;
    const titulo = modal.querySelector('h3');
    if (titulo) titulo.innerText = "Nuevo Turno Manual";
    
    // Agregamos 'm-fecha' y 'm-servicio' a la limpieza
    ['m-cliente-existente', 'm-nombre', 'm-apellido', 'm-telefono', 'm-edad', 'm-hora', 'm-fecha', 'm-servicio'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
}

function limpiarFormularioCliente() {
    const modal = document.getElementById('modal-nuevo-cliente');
    if (!modal) return;
    delete modal.dataset.editingId;
    modal.querySelector('h3').innerText = "Nuevo Cliente";
    ['c-nombre', 'c-apellido', 'c-telefono', 'c-edad'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
}

async function seleccionarClienteExistente(id) {
    if (!id) return;
    const clientes = await Storage.getClientes();
    const cliente = clientes.find(c => c.id == id);
    if (cliente) {
        document.getElementById('m-nombre').value = cliente.nombre;
        document.getElementById('m-apellido').value = cliente.apellido || '';
        document.getElementById('m-telefono').value = cliente.telefono;
        document.getElementById('m-edad').value = cliente.edad || '';
    }
}

async function guardarTurnoManual() {
    const modal = document.getElementById('modal-nuevo-turno');
    const editingId = modal.dataset.editingId;
    const sId = document.getElementById('m-servicio').value;
    const fechaSeleccionada = document.getElementById('m-fecha').value;
    
    if (!sId) return alert("Debes seleccionar un servicio");
    if (!fechaSeleccionada) return alert("Debes seleccionar una fecha");

    const servicios = await Storage.getServicios();
    const serv = servicios.find(s => s.id === sId);
    
    const datos = {
        nombre: document.getElementById('m-nombre').value,
        apellido: document.getElementById('m-apellido').value,
        telefono: document.getElementById('m-telefono').value,
        edad: document.getElementById('m-edad').value,
        servicioId: sId,
        servicioNombre: serv.nombre,
        precio: serv.precio,
        hora: document.getElementById('m-hora').value || "00:00",
        fecha: fechaSeleccionada // Ahora toma la fecha del input
    };

    if (editingId) {
        // Al editar, simplemente actualizamos con la nueva fecha y servicio
        await Storage.actualizarTurno(editingId, datos);
    } else {
        datos.asistio = null;
        await Storage.agregarTurno(datos);
    }
    
    closeModal('modal-nuevo-turno');
    if (window.router) {
        const vistaActiva = document.querySelector('.view:not(.hidden)')?.id.replace('view-', '') || 'home';
        window.router(vistaActiva);
    }
}

async function marcarAsistencia(id, valor) {
    await Storage.actualizarTurno(id, { asistio: valor });
    const vistaActiva = document.querySelector('.view:not(.hidden)')?.id.replace('view-', '') || 'home';
    if (window.router) window.router(vistaActiva);
}

async function editarTurno(id) {
    const turnos = await Storage.getTurnos();
    const turno = turnos.find(t => t.id === id);
    if (!turno) return;
    
    limpiarFormularioTurno();
    const modal = document.getElementById('modal-nuevo-turno');
    modal.querySelector('h3').innerText = "Editar Turno";
    
    document.getElementById('m-nombre').value = turno.nombre;
    document.getElementById('m-apellido').value = turno.apellido || '';
    document.getElementById('m-telefono').value = turno.telefono;
    document.getElementById('m-edad').value = turno.edad || '';
    document.getElementById('m-hora').value = turno.hora;
    document.getElementById('m-fecha').value = turno.fecha; // Carga la fecha actual del turno
    document.getElementById('m-servicio').value = turno.servicioId; // Selecciona el servicio que ya tenía
    
    modal.dataset.editingId = id;
    openModal('modal-nuevo-turno');
}

function cambiarDia(offset) {
    window.fechaFiltro.setDate(window.fechaFiltro.getDate() + offset);
    if (window.router) window.router('agenda');
}

async function guardarClienteNuevo() {
    const modal = document.getElementById('modal-nuevo-cliente');
    const editingId = modal.dataset.editingId;

    const datos = {
        nombre: document.getElementById('c-nombre').value,
        apellido: document.getElementById('c-apellido').value,
        telefono: document.getElementById('c-telefono').value,
        edad: document.getElementById('c-edad').value
    };

    if (!datos.nombre || !datos.telefono) return alert("Nombre y Teléfono son obligatorios");

    if (editingId) {
        await Storage.actualizarCliente(editingId, datos);
    } else {
        datos.visitas = 0;
        await Storage.agregarCliente(datos);
    }

    closeModal('modal-nuevo-cliente');
    limpiarFormularioCliente();
    if (window.router) window.router('clientes');
}

async function editarCliente(id) {
    const clientes = await Storage.getClientes();
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    const modal = document.getElementById('modal-nuevo-cliente');
    modal.dataset.editingId = id;
    modal.querySelector('h3').innerText = "Editar Cliente";

    document.getElementById('c-nombre').value = cliente.nombre || '';
    document.getElementById('c-apellido').value = cliente.apellido || '';
    document.getElementById('c-telefono').value = cliente.telefono || '';
    document.getElementById('c-edad').value = cliente.edad || '';

    openModal('modal-nuevo-cliente');
}

async function eliminarCliente(id) {
    if (confirm("¿Estás seguro de eliminar este cliente?")) {
        await Storage.eliminarCliente(id);
        if (window.router) window.router('clientes');
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if (target) target.classList.remove('hidden');
    
    const isServ = tabId === 'tab-servicios';
    const btnS = document.getElementById('btn-tab-servicios');
    const btnP = document.getElementById('btn-tab-productos');
    
    if (btnS && btnP) {
        btnS.className = isServ ? "px-6 py-3 border-b-2 border-black font-bold text-sm" : "px-6 py-3 border-b-2 border-transparent text-gray-500 font-bold text-sm";
        btnP.className = !isServ ? "px-6 py-3 border-b-2 border-black font-bold text-sm" : "px-6 py-3 border-b-2 border-transparent text-gray-500 font-bold text-sm";
    }
}

async function openModalServicio(id = null) {
    const modal = document.getElementById('modal-nuevo-servicio');
    if (!modal) return;
    modal.dataset.editingId = id || "";
    if (id) {
        const servicios = await Storage.getServicios();
        const s = servicios.find(item => item.id === id);
        document.getElementById('s-nombre').value = s.nombre;
        document.getElementById('s-precio').value = s.precio;
        document.getElementById('s-duracion').value = s.duracion;
    }
    openModal('modal-nuevo-servicio');
}

async function guardarServicio() {
    const id = document.getElementById('modal-nuevo-servicio').dataset.editingId;
    const datos = {
        nombre: document.getElementById('s-nombre').value,
        precio: Number(document.getElementById('s-precio').value),
        duracion: Number(document.getElementById('s-duracion').value)
    };
    await Storage.guardarServicio(id || null, datos);
    closeModal('modal-nuevo-servicio');
    if (window.router) window.router('servicios');
}

async function eliminarServicio(id) {
    if (confirm("¿Eliminar servicio?")) {
        await Storage.eliminarServicio(id);
        if (window.router) window.router('servicios');
    }
}

async function guardarProducto() {
    const datos = {
        nombre: document.getElementById('p-nombre').value,
        precio: Number(document.getElementById('p-precio').value)
    };
    await Storage.agregarProducto(datos);
    closeModal('modal-nuevo-producto');
    if (window.router) window.router('servicios');
}

async function eliminarProducto(id) {
    if (confirm("¿Eliminar producto?")) {
        await Storage.eliminarProducto(id);
        if (window.router) window.router('servicios');
    }
}

// --- REGISTRO GLOBAL (Al final para asegurar que las funciones existan) ---
window.openModal = openModal;
window.closeModal = closeModal;
window.seleccionarClienteExistente = seleccionarClienteExistente;
window.guardarTurnoManual = guardarTurnoManual;
window.marcarAsistencia = marcarAsistencia;
window.editarTurno = editarTurno;
window.cambiarDia = cambiarDia;
window.guardarClienteNuevo = guardarClienteNuevo;
window.editarCliente = editarCliente;
window.limpiarFormularioCliente = limpiarFormularioCliente;
window.eliminarCliente = eliminarCliente;
window.switchTab = switchTab;
window.openModalServicio = openModalServicio;
window.guardarServicio = guardarServicio;
window.eliminarServicio = eliminarServicio;
window.guardarProducto = guardarProducto;
window.eliminarProducto = eliminarProducto;
window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
};