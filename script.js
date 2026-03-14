// CONFIGURACIÓN
const API_URL = "https://newventas.onrender.com/api";

const grupos = {
    "1111": { nombre: "Grupo A", lider: "Juan Perez" },
    "2222": { nombre: "Grupo B", lider: "Andrés López" },
    "3333": { nombre: "Grupo C", lider: "Carlos Ruiz" },
    "0000": { nombre: "Admin", lider: "Pastor Central" }
};

let grupoActivo = null;
let movimientos = [];

// 1. VALIDAR ACCESO
function validarAcceso() {
    const pin = document.getElementById('pinAcceso').value;
    if (grupos[pin]) {
        grupoActivo = grupos[pin];
        document.getElementById('loginModal').classList.add('hidden'); // Uso de classList es más limpio
        document.getElementById('appContent').classList.remove('hidden');
        document.getElementById('infoGrupo').innerText = `Sesión: ${grupoActivo.lider}`;
        cargarDatosDesdeNube();
    } else {
        document.getElementById('errorLogin').classList.remove('hidden');
    }
}

// 2. CARGAR DATOS (Sincronización con Aiven)

async function cargarDatosDesdeNube() {
    try {
        const res = await fetch(`${API_URL}/movimientos`);
        
        // Si el servidor responde mal, no intentamos convertir a JSON
        if (!res.ok) {
            console.error("El servidor respondió con error");
            return;
        }

        const datos = await res.json();
        if (Array.isArray(datos)) {
            movimientos = datos.map(m => ({
                ...m,
                total: parseFloat(m.total) || 0,
                saldo: parseFloat(m.saldo) || 0
            }));
            actualizarInterfaz(movimientos);
        }
    } catch (e) {
        console.error("Error de conexión:", e);
    }
}

// 3. MOSTRAR VALOR MANUAL
function verificarManual() {
    const select = document.getElementById('selectProducto');
    const manual = document.getElementById('valorManual');
    if(select.value === 'MANUAL') {
        manual.classList.remove('hidden');
    } else {
        manual.classList.add('hidden');
    }
}

// 4. REGISTRAR EN LA NUBE
async function registrarMovimiento() {
    const tipo = document.getElementById('tipoMov').value;
    const metodo = document.getElementById('metodoPago').value;
    const selectProd = document.getElementById('selectProducto');
    const desc = document.getElementById('descripcion').value;
    const valorManualInput = document.getElementById('valorManual').value;
    
    // VALIDACIÓN CRÍTICA PARA EVITAR EL NaN
    let valor = 0;
    if (selectProd.value === 'MANUAL') {
        valor = parseFloat(valorManualInput);
    } else {
        valor = parseFloat(selectProd.value);
    }

    // Si el valor sigue siendo inválido o no es un número, frenamos aquí
    if (isNaN(valor) || valor <= 0) {
        return alert("⚠️ Por favor, ingresa un precio válido (solo números).");
    }

    const nuevoMov = {
        lider: grupoActivo.lider,
        grupo: grupoActivo.nombre,
        tipo: tipo,
        metodo_pago: metodo,
        concepto: desc || selectProd.options[selectProd.selectedIndex].text,
        total: valor, // Aquí ya nos aseguramos que ES UN NÚMERO
        saldo: (tipo === 'DEUDA' || metodo === 'FIADO') ? valor : 0,
        comprobante_url: "" 
    };

    console.log("Enviando a la nube:", nuevoMov); // Para que veas en consola qué se envía

    try {
        const res = await fetch(`${API_URL}/movimientos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(nuevoMov)
        });
        
        if (res.ok) {
            alert("✅ ¡Venta guardada con éxito!");
            cargarDatosDesdeNube();
            document.getElementById('descripcion').value = "";
            document.getElementById('valorManual').value = "";
        } else {
            const errorData = await res.json();
            console.error("Detalle del error:", errorData);
            alert("❌ Error en el servidor (Aiven rechazó los datos)");
        }
    } catch (e) {
        alert("❌ Error de conexión. Revisa tu internet.");
    }
}

// 5. DIBUJAR TABLA Y TOTALES
function actualizarInterfaz(datos) {
    const tabla = document.getElementById('tablaCuerpo');
    tabla.innerHTML = "";
    
    let v = 0, d = 0, r = 0;

    datos.forEach(m => {
        if (m.tipo === 'VENTA') v += m.total;
        if (m.tipo === 'DEUDA' || m.metodo_pago === 'FIADO') d += m.saldo;
        if (m.tipo === 'RETIRO') r += m.total;

        tabla.innerHTML += `
            <tr class="border-b border-gray-700 hover:bg-gray-800/50">
                <td class="p-4">
                    <div class="font-bold">${m.concepto}</div>
                    <div class="text-[10px] text-gray-500">${new Date(m.fecha).toLocaleString()} - ${m.lider}</div>
                </td>
                <td class="p-4">
                    <span class="bg-gray-700 px-2 py-1 rounded text-[10px] font-bold">${m.metodo_pago}</span>
                </td>
                <td class="p-4 text-right font-bold ${m.tipo === 'RETIRO' ? 'text-red-400' : 'text-green-400'}">
                    $${m.total.toLocaleString()}
                </td>
                <td class="p-4 text-center">
                    ${m.saldo > 0 ? 
                        '<i class="fas fa-clock text-orange-500" title="Pendiente"></i>' : 
                        '<i class="fas fa-check-circle text-green-500" title="Pagado"></i>'}
                </td>
            </tr>
        `;
    });

    document.getElementById('totalVentas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('totalDeudas').innerText = `$${d.toLocaleString()}`;
    document.getElementById('totalRetiros').innerText = `$${r.toLocaleString()}`;
    document.getElementById('saldoCaja').innerText = `$${(v - r).toLocaleString()}`;
}

// 6. RENDERIZAR AUDITORÍA
function renderizarAuditoria(logs) {
    const div = document.getElementById('logAuditoria');
    if (!div) return; // Seguridad por si el ID cambia
    
    div.innerHTML = logs.map(l => `
        <div class="border-b border-gray-800 py-1">
            <span class="text-blue-400 text-[9px]">[${new Date(l.fecha).toLocaleTimeString()}]</span> 
            <span class="text-white font-bold">${l.lider}:</span> 
            <span class="text-gray-400">${l.accion} - ${l.detalles}</span>
        </div>
    `).join('');
}
