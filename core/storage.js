// core/storage.js
import { db } from '../admin/js/firebase-config.js';
import {
    collection, addDoc, getDocs, updateDoc, doc, deleteDoc,
    query, where, increment, getDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const Storage = {
    // --- TURNOS ---
    async getTurnos() {
        const snapshot = await getDocs(collection(db, "turnos"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async agregarTurno(turno) {
        const docRef = await addDoc(collection(db, "turnos"), turno);
        return { id: docRef.id, ...turno };
    },

    async actualizarTurno(id, datos) {
        const ref = doc(db, "turnos", id);

        // Si el cambio es marcar asistencia positiva
        if (datos.asistio === true) {
            await this.procesarAsistenciaCliente(id);
        }

        await updateDoc(ref, datos);
    },

    // --- LÓGICA DE CLIENTES AUTOMÁTICA ---
    async procesarAsistenciaCliente(turnoId) {
        try {
            // 1. Obtener datos del turno actual
            const turnoRef = doc(db, "turnos", turnoId);
            const turnoSnap = await getDoc(turnoRef);
            if (!turnoSnap.exists()) return;
            const turno = turnoSnap.data();

            // 2. Buscar si el cliente ya existe (usamos teléfono como ID único)
            const clientesRef = collection(db, "clientes");
            const q = query(clientesRef, where("telefono", "==", turno.telefono));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // CASO A: El cliente existe, le sumamos una visita
                const clienteDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, "clientes", clienteDoc.id), {
                    visitas: increment(1),
                    ultimoServicio: turno.servicioNombre
                });
            } else {
                // CASO B: Cliente nuevo, lo creamos con su primera visita
                await addDoc(collection(db, "clientes"), {
                    nombre: turno.nombre,
                    apellido: turno.apellido || '',
                    telefono: turno.telefono,
                    edad: turno.edad || null,
                    visitas: 1,
                    fechaRegistro: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error("Error al procesar cliente:", error);
        }
    },

    // --- CLIENTES ---
    async getClientes() {
        const snapshot = await getDocs(collection(db, "clientes"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async agregarCliente(cliente) {
        const docRef = await addDoc(collection(db, "clientes"), cliente);
        return { id: docRef.id, ...cliente };
    },

    async actualizarCliente(id, datosNuevos) {
        let clientes = await this.getClientes();
        clientes = clientes.map(c => c.id === id ? { ...c, ...datosNuevos } : c);
        localStorage.setItem('clientes', JSON.stringify(clientes));
    },

    async eliminarCliente(id) {
        await deleteDoc(doc(db, "clientes", id));
    },

    // --- SERVICIOS (CORTES) ---
    async getServicios() {
        const snapshot = await getDocs(collection(db, "servicios"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async guardarServicio(id, datos) {
        if (id) {
            await updateDoc(doc(db, "servicios", id), datos);
        } else {
            await addDoc(collection(db, "servicios"), datos);
        }
    },
    async eliminarServicio(id) {
        await deleteDoc(doc(db, "servicios", id));
    },

    // --- PRODUCTOS (STOCK) ---
    async getProductos() {
        const snapshot = await getDocs(collection(db, "productos"));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async guardarProducto(id, datos) {
        if (id) {
            await updateDoc(doc(db, "productos", id), datos);
        } else {
            datos.stock = 0; // Inicia en cero
            await addDoc(collection(db, "productos"), datos);
        }
    },
    // Registrar venta o reposición
    async registrarMovimientoProducto(id, cantidad, tipo, costoUnitario = 0) {
        const ref = doc(db, "productos", id);
        const snap = await getDoc(ref);
        const prod = snap.data();

        // Actualizar stock
        const nuevoStock = tipo === 'venta' ? prod.stock - cantidad : prod.stock + cantidad;
        await updateDoc(ref, { stock: nuevoStock });

        // Registrar en Caja (Colección 'movimientos_caja')
        await addDoc(collection(db, "movimientos_caja"), {
            fecha: new Date().toISOString(),
            tipo: tipo === 'venta' ? 'ingreso' : 'egreso',
            concepto: `${tipo.toUpperCase()}: ${prod.nombre} (Cant: ${cantidad})`,
            monto: tipo === 'venta' ? (prod.precio * cantidad) : (costoUnitario * cantidad)
        });
    }
};

export default Storage;