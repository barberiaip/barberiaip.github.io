// admin/js/app.js
import { router } from './router.js';
import './handlers.js'; 
import Storage from '../../core/storage.js';

// 1. Fecha global
window.fechaFiltro = new Date();

document.addEventListener('DOMContentLoaded', async () => {
    // 2. Carga inicial de datos para selectores
    await cargarSelectoresModales();

    // 3. Arrancar App
    window.router('home');
});

async function cargarSelectoresModales() {
    try {
        const mServicio = document.getElementById('m-servicio');
        if (mServicio) {
            const servicios = await Storage.getServicios();
            mServicio.innerHTML = servicios.map(s => 
                `<option value="${s.id}">${s.nombre} ($${s.precio})</option>`
            ).join('');
        }

        const mClienteExistente = document.getElementById('m-cliente-existente');
        if (mClienteExistente) {
            const clientes = await Storage.getClientes();
            mClienteExistente.innerHTML = '<option value="">-- Seleccionar cliente (opcional) --</option>' + 
                clientes.map(c => `<option value="${c.id}">${c.apellido}, ${c.nombre}</option>`).join('');
        }
    } catch (e) {
        console.error("Error inicializando modales:", e);
    }
}

window.refreshAdminSelects = cargarSelectoresModales;