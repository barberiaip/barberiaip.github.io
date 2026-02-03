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
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if(!servicioSeleccionado) return alert("Por favor, selecciona un servicio.");

        const nombreInput = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;

        if(!telefono || telefono.length < 8) return alert("Ingresa un WhatsApp válido.");

        try {
            // --- LÓGICA DE IDENTIFICACIÓN ---
            const clientes = await Storage.getClientes();
            const nombreNormalizado = normalizar(nombreInput);
            
            // Buscamos si existe un cliente con el mismo nombre normalizado
            let clienteEncontrado = clientes.find(c => normalizar(`${c.nombre} ${c.apellido || ''}`) === nombreNormalizado);

            let finalClienteId = null;

            if (clienteEncontrado) {
                // Si existe, usamos su ID
                finalClienteId = clienteEncontrado.id;
            } else {
                // Si no existe, creamos la ficha de cliente automáticamente
                const partesNombre = nombreInput.split(' ');
                const soloNombre = partesNombre[0];
                const soloApellido = partesNombre.slice(1).join(' ');

                const nuevoCliente = {
                    nombre: soloNombre,
                    apellido: soloApellido,
                    telefono: telefono,
                    visitas: 0
                };
                const res = await Storage.agregarCliente(nuevoCliente);
                finalClienteId = res.id;
            }

            const turnoData = {
                nombre: nombreInput,
                clienteId: finalClienteId, // Vinculamos el turno al cliente
                telefono: telefono,
                fecha: inputFecha.value,
                hora: selectHora.value,
                servicioId: servicioSeleccionado.id,
                servicioNombre: servicioSeleccionado.nombre,
                precio: servicioSeleccionado.precio,
                asistio: null 
            };

            await Storage.agregarTurno(turnoData);

            // Mensaje de WhatsApp
            const mensaje = `*HOLA BARBERÍA IP*\n\n` +
                            `*Cliente:* ${turnoData.nombre}\n` +
                            `*Servicio:* ${turnoData.servicioNombre}\n` +
                            `*Fecha:* ${turnoData.fecha}\n` +
                            `*Hora:* ${turnoData.hora} hs\n\n` +
                            `_Confirmado vía Web_`;

            const url = `https://wa.me/3425014195?text=${encodeURIComponent(mensaje)}`;
            window.open(url, '_blank');
            
            form.reset();
            totalDisplay.innerText = '$0';
            selectHora.disabled = true;
            
        } catch (error) {
            console.error(error);
        }
    });
});