const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. CONFIGURACIÓN DE CORS (Corregido para evitar bloqueos)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 2. CONEXIÓN A LA BASE DE DATOS
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 3. INICIALIZACIÓN DE TABLAS (Añadida Auditoría)
const initDB = () => {
    const sqlMovimientos = `
    CREATE TABLE IF NOT EXISTS movimientos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        lider VARCHAR(100),
        grupo VARCHAR(50),
        tipo VARCHAR(20),
        metodo_pago VARCHAR(20),
        concepto VARCHAR(100),
        total DECIMAL(10, 2),
        saldo DECIMAL(10, 2),
        comprobante_url TEXT
    );`;

    const sqlAuditoria = `
    CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        lider VARCHAR(100),
        accion VARCHAR(100),
        detalles TEXT
    );`;

    pool.query(sqlMovimientos, (err) => {
        if (err) console.error("❌ Error Tabla Movimientos:", err);
        else console.log("✅ Tabla Movimientos Lista");
    });

    pool.query(sqlAuditoria, (err) => {
        if (err) console.error("❌ Error Tabla Auditoría:", err);
        else console.log("✅ Tabla Auditoría Lista");
    });
};

initDB();

// 4. RUTAS (Puntos de acceso)

// Obtener todos los movimientos
app.get('/api/movimientos', (req, res) => {
    pool.query('SELECT * FROM movimientos ORDER BY fecha DESC', (err, rows) => {
        if (err) {
            console.error("Error GET movimientos:", err);
            return res.status(500).json({ error: "Error al obtener datos" });
        }
        res.json(rows);
    });
});

// Guardar nuevo movimiento y registrar en auditoría
app.post('/api/movimientos', (req, res) => {
    const { lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url } = req.body;
    
    const sqlInsert = 'INSERT INTO movimientos (lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    pool.query(sqlInsert, [lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url], (err, result) => {
        if (err) {
            console.error("Error POST movimientos:", err);
            return res.status(500).json({ error: "Error al guardar" });
        }

        // Registrar automáticamente en la auditoría
        const accionDesc = `Creó ${tipo}: ${concepto}`;
        const detalleDesc = `Monto: $${total} - Pago: ${metodo_pago}`;
        pool.query('INSERT INTO auditoria (lider, accion, detalles) VALUES (?, ?, ?)', [lider, accionDesc, detalleDesc]);

        res.json({ id: result.insertId, message: "Registro exitoso" });
    });
});

// Obtener historial de auditoría
app.get('/api/auditoria', (req, res) => {
    pool.query('SELECT * FROM auditoria ORDER BY fecha DESC LIMIT 100', (err, rows) => {
        if (err) {
            console.error("Error GET auditoría:", err);
            return res.status(500).json({ error: "Error al obtener auditoría" });
        }
        res.json(rows);
    });
});

// 5. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 10000; // Render prefiere el 10000
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
