// admin/js/ui.js
import Storage from '../../core/storage.js';

let cajaChart = null;

export async function renderHome() {
    const turnos = await Storage.getTurnos();
    const hoy = new Date().toISOString().split('T')[0];
    const mananaDate = new Date();
    mananaDate.setDate(mananaDate.getDate() + 1);
    const manana = mananaDate.toISOString().split('T')[0];

    const turnosHoy = turnos.filter(t => t.fecha === hoy);
    const turnosManana = turnos.filter(t => t.fecha === manana);

    const ingresosHoy = turnosHoy
        .filter(t => t.asistio === true)
        .reduce((acc, t) => acc + (Number(t.precio) || 0), 0);

    // Validaciones para evitar el error "Cannot set properties of null"
    const elIngresos = document.getElementById('h-ingresos-hoy');
    const elTurnos = document.getElementById('h-turnos-hoy');
    const elPendientes = document.getElementById('h-pendientes-hoy');

    if (elIngresos) elIngresos.innerText = `$${ingresosHoy}`;
    if (elTurnos) elTurnos.innerText = turnosHoy.length;
    if (elPendientes) elPendientes.innerText = turnosHoy.filter(t => t.asistio === null).length;

    const renderListaSimple = (lista, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = lista.length ? '' : '<p class="text-gray-400 text-sm p-4">No hay turnos registrados.</p>';

        lista.sort((a, b) => a.hora.localeCompare(b.hora)).forEach(t => {
            container.innerHTML += `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${t.hora} hs - ${t.nombre}</p>
                        <p class="text-[10px] text-gray-500 uppercase font-semibold">${t.servicioNombre}</p>
                    </div>
                    <span class="${t.asistio ? 'bg-green-100 text-green-700' : (t.asistio === false ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')} px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                        ${t.asistio === true ? 'Asistió' : (t.asistio === false ? 'Faltó' : 'Pendiente')}
                    </span>
                </div>`;
        });
    };
    renderListaSimple(turnosHoy, 'home-lista-hoy');
    renderListaSimple(turnosManana, 'home-lista-manana');
}

export async function renderAgenda() {
    const container = document.getElementById('lista-turnos-agenda');
    const displayFecha = document.getElementById('agenda-fecha-display');
    if (!container || !displayFecha) return;

    const opciones = { day: 'numeric', month: 'long' };
    displayFecha.innerText = window.fechaFiltro.toLocaleDateString('es-ES', opciones);

    const fBusqueda = window.fechaFiltro.toISOString().split('T')[0];
    const todosLosTurnos = await Storage.getTurnos();
    const turnos = todosLosTurnos
        .filter(t => t.fecha === fBusqueda)
        .sort((a, b) => a.hora.localeCompare(b.hora));

    if (turnos.length === 0) {
        container.innerHTML = `<div class="text-center py-20 text-gray-400"><p>No hay turnos para este día</p></div>`;
        return;
    }

    container.innerHTML = turnos.map(t => {
        const asistio = t.asistio === true;
        const noAsistio = t.asistio === false;
        return `
            <div class="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 transition-all ${asistio ? 'border-l-8 border-l-green-500' : (noAsistio ? 'border-l-8 border-l-red-500' : '')}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-black text-2xl text-slate-900 leading-none">${t.nombre} ${t.apellido || ''}</h4>
                        <p class="text-blue-500 text-sm font-bold mt-1">${t.telefono || ''}</p>
                    </div>
                    <div class="text-right">
                        <span class="block text-xs font-bold text-gray-400 uppercase tracking-widest">Importe</span>
                        <span class="font-black text-green-600 text-2xl">$${t.precio}</span>
                    </div>
                </div>
                <div class="flex items-center gap-6 mt-4">
                    <span class="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold text-sm">${t.hora} hs</span>
                    <span class="text-sm font-bold text-gray-500 uppercase tracking-wider">${t.servicioNombre}</span>
                </div>
                <div class="flex justify-end items-center pt-4 border-t border-gray-50 mt-4 gap-3">
                    <button onclick="editarTurno('${t.id}')" class="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onclick="marcarAsistencia('${t.id}', false)" class="px-4 h-10 flex items-center gap-2 rounded-xl font-bold text-xs transition-all ${noAsistio ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-400'}">FALTÓ</button>
                    <button onclick="marcarAsistencia('${t.id}', true)" class="px-4 h-10 flex items-center gap-2 rounded-xl font-bold text-xs transition-all ${asistio ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-400'}">ASISTIÓ</button>
                </div>
            </div>`;
    }).join('');
}

export async function renderClientes() {
    const tableContainer = document.getElementById('lista-clientes-tabla');
    const mobileContainer = document.getElementById('lista-clientes-mobile');
    if (!tableContainer || !mobileContainer) return;

    const clientes = await Storage.getClientes();
    const sortedClientes = clientes.sort((a, b) => (b.visitas || 0) - (a.visitas || 0));

    const iconEdit = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;
    const iconDel = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;

    // Renderizado para Desktop
    tableContainer.innerHTML = sortedClientes.map(c => `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50">
            <td class="p-4"><div class="font-bold text-gray-900">${c.nombre} ${c.apellido || ''}</div></td>
            <td class="p-4 text-sm text-gray-600">${c.telefono || 'Sin tel.'}</td>
            <td class="p-4 text-center"><span class="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg text-xs uppercase">${c.visitas || 0} Visitas</span></td>
            <td class="p-4 text-right flex justify-end gap-2">
                <button onclick="editarCliente('${c.id}')" class="text-blue-400 hover:text-blue-600 p-2">${iconEdit}</button>
                <button onclick="eliminarCliente('${c.id}')" class="text-gray-300 hover:text-red-500 p-2">${iconDel}</button>
            </td>
        </tr>`).join('');

    // Renderizado para Móvil
    mobileContainer.innerHTML = sortedClientes.map(c => `
        <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
                <h4 class="font-black text-lg text-slate-900">${c.nombre} ${c.apellido || ''}</h4>
                <p class="text-blue-600 text-sm font-medium">${c.telefono || 'Sin teléfono'}</p>
                <div class="mt-2 flex gap-2">
                    <span class="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">${c.visitas || 0} Visitas</span>
                    ${c.edad ? `<span class="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">${c.edad} años</span>` : ''}
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="editarCliente('${c.id}')" class="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500">${iconEdit}</button>
                <button onclick="eliminarCliente('${c.id}')" class="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-400">${iconDel}</button>
            </div>
        </div>`).join('');
}

export async function renderServiciosConfig() {
    const sContainer = document.getElementById('lista-servicios-tabla');
    const pContainer = document.getElementById('lista-productos-tabla');
    if (!sContainer || !pContainer) return;

    const servicios = await Storage.getServicios();
    sContainer.innerHTML = servicios.map(s => `
        <tr class="border-b border-gray-50">
            <td class="p-4 font-bold text-slate-700">${s.nombre}</td>
            <td class="p-4 text-green-600 font-bold">$${s.precio}</td>
            <td class="p-4 text-gray-500">${s.duracion} min</td>
            <td class="p-4 text-right">
                <button onclick="openModalServicio('${s.id}')" class="text-blue-500 font-bold mr-3 text-sm">Editar</button>
                <button onclick="eliminarServicio('${s.id}')" class="text-red-400 text-sm">Eliminar</button>
            </td>
        </tr>`).join('');

    const productos = await Storage.getProductos ? await Storage.getProductos() : [];
    pContainer.innerHTML = productos.map(p => `
        <tr class="border-b border-gray-50">
            <td class="p-4 font-bold text-slate-700">${p.nombre}</td>
            <td class="p-4 text-green-600 font-bold">$${p.precio}</td>
            <td class="p-4 text-right">
                <button onclick="eliminarProducto('${p.id}')" class="text-red-400 text-sm">Eliminar</button>
            </td>
        </tr>`).join('');
}

export async function renderCaja() {
    const turnos = await Storage.getTurnos();
    const ingresosMes = turnos
        .filter(t => t.asistio === true)
        .reduce((acc, t) => acc + (Number(t.precio) || 0), 0);

    const elIng = document.getElementById('caja-ingresos-mes');
    const elEgr = document.getElementById('caja-egresos-mes');
    const elBal = document.getElementById('caja-balance');

    if (elIng) elIng.innerText = `$${ingresosMes}`;
    if (elEgr) elEgr.innerText = `$0`;
    if (elBal) elBal.innerText = `$${ingresosMes}`;

    const ctx = document.getElementById('chartCaja');
    if (!ctx) return;

    if (cajaChart) cajaChart.destroy();

    cajaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [{
                label: 'Ingresos',
                data: [ingresosMes * 0.2, ingresosMes * 0.5, ingresosMes * 0.8, ingresosMes],
                borderColor: '#10b981',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(16, 185, 129, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}