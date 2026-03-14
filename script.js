// CONFIGURACIÓN (REEMPLAZA ESTA URL CUANDO TENGAS LA DE RENDER)

const API_URL = "https://newventas.onrender.com/api";

const grupos = {
    "1111": { nombre: "Grupo A", lider: "Juan Perez" },
    "2222": { nombre: "Grupo B", lider: "Andrés López" },
    "3333": { nombre: "Grupo C", lider: "Carlos Ruiz" },
    "0000": { nombre: "Admin", lider: "Pastor Central" }
};

let grupoActivo = null;
let movimientos = [];

// VALIDAR ACCESO
function validarAcceso() {
    const pin = document.getElementById('pinAcceso').value;
    if (grupos[pin]) {
        grupoActivo = grupos[pin];
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('appContent').classList.remove('hidden');
        document.getElementById('infoGrupo').innerText = `Sesión: ${grupoActivo.lider}`;
        cargarDatosDesdeNube();
    } else {
        document.getElementById('errorLogin').classList.remove('hidden');
    }
}

// CARGAR DATOS
async function cargarDatosDesdeNube() {
    try {
        const [resMov, resAud] = await Promise.all([
            fetch(`${API_URL}/movimientos`),
            fetch(`${API_URL}/auditoria`)
        ]);
        
        movimientos = await resMov.json();
        const auditoria = await resAud.json();
        
        actualizarInterfaz(movimientos);
        renderizarAuditoria(auditoria);
    } catch (e) {
        console.error("Error sincronizando:", e);
    }
}

// MOSTRAR VALOR MANUAL
function verificarManual() {
    const select = document.getElementById('selectProducto');
    const manual = document.getElementById('valorManual');
    manual.classList.toggle('hidden', select.value !== 'MANUAL');
}

// REGISTRAR
async function registrarMovimiento() {
    const tipo = document.getElementById('tipoMov').value;
    const metodo = document.getElementById('metodoPago').value;
    const selectProd = document.getElementById('selectProducto');
    const desc = document.getElementById('descripcion').value;
    
    let valor = selectProd.value === 'MANUAL' ? 
                parseFloat(document.getElementById('valorManual').value) : 
                parseFloat(selectProd.value);

    if (!valor || valor <= 0) return alert("Por favor ingresa un valor");

    const nuevoMov = {
        lider: grupoActivo.lider,
        grupo: grupoActivo.nombre,
        tipo: tipo,
        metodo_pago: metodo,
        concepto: desc || selectProd.options[selectProd.selectedIndex].text,
        total: valor,
        saldo: (tipo === 'DEUDA' || metodo === 'FIADO') ? valor : 0,
        comprobante_url: "" 
    };

    try {
        const res = await fetch(`${API_URL}/movimientos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(nuevoMov)
        });
        if (res.ok) {
            cargarDatosDesdeNube();
            document.getElementById('descripcion').value = "";
            document.getElementById('valorManual').value = "";
        }
    } catch (e) {
        alert("Error al guardar");
    }
}

// DIBUJAR TABLA Y TOTALES
function actualizarInterfaz(datos) {
    const tabla = document.getElementById('tablaCuerpo');
    tabla.innerHTML = "";
    
    let v = 0, d = 0, r = 0;

    datos.forEach(m => {
        const total = parseFloat(m.total);
        const saldo = parseFloat(m.saldo);
        
        if (m.tipo === 'VENTA') v += total;
        if (m.tipo === 'DEUDA') d += saldo;
        if (m.tipo === 'RETIRO') r += total;

        tabla.innerHTML += `
            <tr class="text-sm">
                <td class="p-4">
                    <div class="font-bold">${m.concepto}</div>
                    <div class="text-[10px] text-gray-500">${new Date(m.fecha).toLocaleDateString()} - ${m.lider}</div>
                </td>
                <td class="p-4"><span class="bg-gray-700 px-2 py-1 rounded text-[10px]">${m.metodo_pago}</span></td>
                <td class="p-4 text-right font-bold ${m.tipo === 'RETIRO' ? 'text-red-400' : 'text-green-400'}">
                    $${total.toLocaleString()}
                </td>
                <td class="p-4 text-center">
                    ${saldo > 0 ? '<i class="fas fa-clock text-orange-500"></i>' : '<i class="fas fa-check-circle text-green-500"></i>'}
                </td>
            </tr>
        `;
    });

    document.getElementById('totalVentas').innerText = `$${v.toLocaleString()}`;
    document.getElementById('totalDeudas').innerText = `$${d.toLocaleString()}`;
    document.getElementById('totalRetiros').innerText = `$${r.toLocaleString()}`;
    document.getElementById('saldoCaja').innerText = `$${(v - r).toLocaleString()}`;
}

function renderizarAuditoria(logs) {
    const div = document.getElementById('logAuditoria');
    div.innerHTML = logs.map(l => `
        <div>[${new Date(l.fecha).toLocaleTimeString()}] ${l.lider}: ${l.accion} - ${l.detalles}</div>
    `).join('');
}
