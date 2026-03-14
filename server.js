const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path'); // Necesario para manejar rutas de archivos
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Esta línea es la que soluciona el error "No se puede obtener /"
// Permite que Render sirva tu HTML, CSS y JS automáticamente
app.use(express.static(path.join(__dirname)));

// --- CONEXIÓN A LA BASE DE DATOS (AIVEN) ---
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- INICIALIZAR TABLAS ---
const inicializarTablas = () => {
    const tablaMovimientos = `
    CREATE TABLE IF NOT EXISTS movimientos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        lider VARCHAR(100),
        grupo VARCHAR(50),
        tipo VARCHAR(50),
        metodo_pago VARCHAR(50),
        concepto VARCHAR(255),
        total DECIMAL(10, 2),
        saldo DECIMAL(10, 2),
        comprobante_url TEXT
    );`;

    const tablaAuditoria = `
    CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        lider VARCHAR(100),
        accion VARCHAR(100),
        detalles TEXT
    );`;

    pool.query(tablaMovimientos, (err) => {
        if (err) console.error("❌ Error al crear tabla Movimientos:", err);
        else console.log("✅ Tabla Movimientos lista");
    });

    pool.query(tablaAuditoria, (err) => {
        if (err) console.error("❌ Error al crear tabla Auditoria:", err);
        else console.log("✅ Tabla Auditoria lista");
    });
};

inicializarTablas();

// --- RUTAS DE LA API ---

// Ruta principal para servir la App
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Obtener movimientos
app.get('/api/movimientos', (req, res) => {
    pool.query('SELECT * FROM movimientos ORDER BY fecha DESC', (err, rows) => {
        if (err) {
            console.error("Error al obtener movimientos:", err);
            return res.status(500).json({ error: "Error en la base de datos" });
        }
        res.json(rows);
    });
});

// Guardar nuevo movimiento
app.post('/api/movimientos', (req, res) => {
    const { lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url } = req.body;
    const sql = 'INSERT INTO movimientos (lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    pool.query(sql, [lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url], (err, result) => {
        if (err) {
            console.error("❌ Error al insertar en Aiven:", err);
            return res.status(500).json({ error: err.message });
        }
        
        // Registro automático en auditoría
        pool.query('INSERT INTO auditoria (lider, accion, detalles) VALUES (?, ?, ?)', 
        [lider, 'REGISTRO', `${tipo}: ${concepto} - $${total}`]);
        
        res.json({ id: result.insertId, status: "success" });
    });
});

// Obtener auditoría
app.get('/api/auditoria', (req, res) => {
    pool.query('SELECT * FROM auditoria ORDER BY fecha DESC LIMIT 50', (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor funcionando en puerto ${PORT}`);
    console.log(`🔗 App disponible en: https://newventas.onrender.com`);
});
