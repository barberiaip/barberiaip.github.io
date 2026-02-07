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
    const btnWhatsapp = document.getElementById('btn-whatsapp');

    // Función para actualizar el enlace de WhatsApp dinámicamente
    const actualizarLink = () => {
        const nombre = document.getElementById('nombre').value;
        const fecha = inputFecha.value;
        const hora = selectHora.value;
        const servicio = servicioSeleccionado ? servicioSeleccionado.nombre : "";

        if (nombre && fecha && hora && servicio) {
            const numeroAdmin = "5493425014195";
            const mensaje = encodeURIComponent(
                `*HOLA BARBERÍA IP*\n\n` +
                `*Cliente:* ${nombre}\n` +
                `*Servicio:* ${servicio}\n` +
                `*Fecha:* ${fecha}\n` +
                `*Hora:* ${hora} hs\n\n` +
                `_Confirmado vía Web_`
            );
            btnWhatsapp.href = `https://api.whatsapp.com/send?phone=${numeroAdmin}&text=${mensaje}`;
        }
    };

    // Escuchar cambios en todo el formulario para tener el link listo
    form.addEventListener('input', actualizarLink);
    form.addEventListener('change', actualizarLink);

    // Al hacer clic en el botón/enlace
    btnWhatsapp.addEventListener('click', async (e) => {
        const nombreInput = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;

        // Validaciones manuales antes de salir
        if (!nombreInput || !inputFecha.value || !selectHora.value || !servicioSeleccionado) {
            e.preventDefault();
            return alert("Por favor, completa todos los campos.");
        }

        if (!telefono || telefono.length < 8) {
            e.preventDefault();
            return alert("Ingresa un WhatsApp válido.");
        }

        // GUARDAR EN FIREBASE (Se hace en segundo plano mientras se abre WhatsApp)
        try {
            const turnoData = {
                nombre: nombreInput,
                telefono: telefono,
                fecha: inputFecha.value,
                hora: selectHora.value,
                servicioNombre: servicioSeleccionado.nombre,
                precio: servicioSeleccionado.precio,
                asistio: null 
            };
            
            // Registramos el turno sin esperar (para no frenar la apertura de WhatsApp)
            Storage.agregarTurno(turnoData);
            
            // Opcional: limpiar el formulario después de un segundo
            setTimeout(() => form.reset(), 1000);

        } catch (error) {
            console.error("Error al guardar:", error);
        }
    });
});