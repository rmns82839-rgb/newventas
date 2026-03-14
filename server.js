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

// Crear tablas automáticamente
const initDB = () => {
    const sql = `CREATE TABLE IF NOT EXISTS movimientos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        lider VARCHAR(100),
        grupo VARCHAR(50),
        tipo ENUM('VENTA', 'DEUDA', 'RETIRO'),
        metodo_pago ENUM('EFECTIVO', 'NEQUI', 'LLAVE', 'FIADO'),
        concepto VARCHAR(100),
        total DECIMAL(10, 2),
        saldo DECIMAL(10, 2),
        comprobante_url TEXT
    );`;
    pool.query(sql, (err) => { if (err) console.log(err); else console.log("✅ DB Lista"); });
};
initDB();

app.get('/api/movimientos', (req, res) => {
    pool.query('SELECT * FROM movimientos ORDER BY fecha DESC', (err, rows) => {
        if (err) res.status(500).json(err); else res.json(rows);
    });
});

app.post('/api/movimientos', (req, res) => {
    const { lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url } = req.body;
    const sql = 'INSERT INTO movimientos (lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    pool.query(sql, [lider, grupo, tipo, metodo_pago, concepto, total, saldo, comprobante_url], (err, result) => {
        if (err) res.status(500).json(err); else res.json({ id: result.insertId });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Puerto ${PORT}`));