const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
});

// FUNCIÓN PARA ASEGURAR QUE LAS TABLAS EXISTAN
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
        if (err) console.error("Error Movimientos:", err);
        else console.log("✅ Tabla Movimientos lista");
    });

    pool.query(tablaAuditoria, (err) => {
        if (err) console.error("Error Auditoria:", err);
        else console.log("✅ Tabla Auditoria lista");
    });
};

inicializarTablas();

// RUTAS
app.get('/api/movimientos', (req, res) => {
    pool.query('SELECT * FROM movimientos ORDER BY fecha DESC', (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

app.post('/api/movimientos', (req, res) => {
    const { lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url } = req.body;
    const sql = 'INSERT INTO movimientos (lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    pool.query(sql, [lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url], (err, result) => {
        if (err) {
            console.error("Error al insertar:", err);
            return res.status(500).json(err);
        }
        
        // Registro en auditoría
        pool.query('INSERT INTO auditoria (lider, accion, detalles) VALUES (?, ?, ?)', 
        [lider, 'REGISTRO', `${tipo}: ${concepto} - $${total}`]);
        
        res.json({ id: result.insertId, ...req.body });
    });
});

app.get('/api/auditoria', (req, res) => {
    pool.query('SELECT * FROM auditoria ORDER BY fecha DESC LIMIT 50', (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
