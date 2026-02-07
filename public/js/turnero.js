// public/js/turnero.js
import Storage from '../../core/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('form-reserva');
    const inputFecha = document.getElementById('fecha');
    const selectHora = document.getElementById('hora');
    const serviciosContainer = document.getElementById('servicios-container');
    const totalDisplay = document.getElementById('total-display');

    let servicioSeleccionado = null;

    // Función para normalizar texto (quitar tildes, espacios y pasar a minúsculas)
    const normalizar = (texto) => {
        if (!texto) return "";
        return texto.trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // 1. Cargar Servicios desde Firebase
    const servicios = await Storage.getServicios();
    serviciosContainer.innerHTML = ''; 
    servicios.forEach(s => {
        const div = document.createElement('div');
        div.innerHTML = `
            <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                <div class="flex items-center gap-3">
                    <input type="radio" name="servicio" value="${s.id}" data-precio="${s.precio}" data-nombre="${s.nombre}" class="w-4 h-4 text-black border-gray-300 focus:ring-black" required>
                    <span class="font-medium text-slate-700">${s.nombre}</span>
                </div>
                <span class="text-slate-400 text-sm">$${s.precio}</span>
            </label>
        `;
        serviciosContainer.appendChild(div);
    });

    serviciosContainer.addEventListener('change', (e) => {
        if (e.target.name === 'servicio') {
            const radio = e.target;
            totalDisplay.innerText = `$${radio.getAttribute('data-precio')}`;
            servicioSeleccionado = {
                id: radio.value,
                nombre: radio.getAttribute('data-nombre'),
                precio: radio.getAttribute('data-precio')
            };
        }
    });

    // 2. Lógica de Disponibilidad
    inputFecha.addEventListener('change', async (e) => {
        const fechaSeleccionada = e.target.value;
        if(!fechaSeleccionada) return;

        const fechaObj = new Date(fechaSeleccionada + 'T00:00:00');
        const diaSemana = fechaObj.getDay();

        selectHora.innerHTML = '<option>Consultando disponibilidad...</option>';
        selectHora.disabled = true;

        if (diaSemana === 0) {
            alert("Los domingos la barbería permanece cerrada.");
            inputFecha.value = '';
            selectHora.innerHTML = '<option>Cerrado</option>';
            return;
        }

        const todosLosTurnos = await Storage.getTurnos();
        const ocupados = todosLosTurnos
            .filter(t => t.fecha === fechaSeleccionada)
            .map(t => t.hora);

        selectHora.innerHTML = '';
        let inicio = 10, fin = 20;
        let huboLibres = false;

        for (let h = inicio; h < fin; h++) {
            for (let m of ['00', '30']) {
                const horaStr = `${h < 10 ? '0' + h : h}:${m}`;
                if (!ocupados.includes(horaStr)) {
                    const opt = document.createElement('option');
                    opt.value = horaStr;
                    opt.innerText = `${horaStr} hs`;
                    selectHora.appendChild(opt);
                    huboLibres = true;
                }
            }
        }
        selectHora.disabled = !huboLibres;
        if (!huboLibres) selectHora.innerHTML = '<option>No hay turnos disponibles</option>';
    });

    // 3. Envío de Turno con Reconocimiento de Cliente
    // 3. Envío de Turno con Reconocimiento de Cliente
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if(!servicioSeleccionado) return alert("Por favor, selecciona un servicio.");

        const nombreInput = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;

        if(!telefono || telefono.length < 8) return alert("Ingresa un WhatsApp válido.");

        // Bloqueamos el botón para evitar doble click
        const btnSubmit = form.querySelector('button[type="submit"]');
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Procesando...";

        try {
            // --- LÓGICA DE BASE DE DATOS ---
            const clientes = await Storage.getClientes();
            const nombreNormalizado = normalizar(nombreInput);
            let clienteEncontrado = clientes.find(c => normalizar(`${c.nombre} ${c.apellido || ''}`) === nombreNormalizado);

            let finalClienteId = null;
            if (clienteEncontrado) {
                finalClienteId = clienteEncontrado.id;
            } else {
                const partesNombre = nombreInput.split(' ');
                const nuevoCliente = {
                    nombre: partesNombre[0],
                    apellido: partesNombre.slice(1).join(' '),
                    telefono: telefono,
                    visitas: 0
                };
                const res = await Storage.agregarCliente(nuevoCliente);
                finalClienteId = res.id;
            }

            const turnoData = {
                nombre: nombreInput,
                clienteId: finalClienteId,
                telefono: telefono,
                fecha: inputFecha.value,
                hora: selectHora.value,
                servicioId: servicioSeleccionado.id,
                servicioNombre: servicioSeleccionado.nombre,
                precio: servicioSeleccionado.precio,
                asistio: null 
            };

            // Guardamos en Firebase
            await Storage.agregarTurno(turnoData);

            // --- REDIRECCIÓN DE WHATSAPP ---
            const numeroAdmin = "5493425014195"; 
            const mensaje = `*HOLA BARBERÍA IP*%0A%0A` +
                            `*Cliente:* ${turnoData.nombre}%0A` +
                            `*Servicio:* ${turnoData.servicioNombre}%0A` +
                            `*Fecha:* ${turnoData.fecha}%0A` +
                            `*Hora:* ${turnoData.hora} hs%0A%0A` +
                            `_Confirmado vía Web_`;

            // En lugar de window.open, usamos location.href que es más efectivo en móviles
            const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroAdmin}&text=${mensaje}`;
            
            // Limpiamos el formulario antes de irnos
            form.reset();
            
            // Redirigir
            window.location.href = urlWhatsApp;

        } catch (error) {
            console.error(error);
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
    });
});