const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Servir el frontend como archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// ═══════════ CONEXIÓN A BASE DE DATOS ═══════════
// Si existe DATABASE_URL (nube / Neon), la usa.
// Si no, usa la configuración local de Docker.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: 'admin',
      host: 'localhost',
      database: 'cotizador_db',
      password: 'adminpassword',
      port: 5432,
    });

// Endpoint 1: OBTENER todos los clientes
app.get('/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});

// Endpoint 2: CREAR un nuevo cliente
app.post('/clientes', async (req, res) => {
  const { nombre, rut, email, empresa } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombre, rut, email, empresa) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, rut, email, empresa]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al crear el cliente');
  }
});

// 3. OBTENER todos los productos
app.get('/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Error al obtener productos');
  }
});

// 4. CREAR un producto
app.post('/productos', async (req, res) => {
  const { codigo_sku, nombre, precio_base, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO productos (codigo_sku, nombre, precio_base, stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [codigo_sku, nombre, precio_base, stock]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Error al crear producto');
  }
});

// 5. CREAR cotización (Cabecera + Detalles)
app.post('/cotizaciones', async (req, res) => {
  const { cliente_id, subtotal, iva, total, detalles } = req.body;
  // detalles debe ser un array: [{ producto_sku, cantidad, precio_venta }]

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Inicia transacción segura

    // Guardar la cabecera de la cotización
    const cotizacionRes = await client.query(
      'INSERT INTO cotizaciones (cliente_id, subtotal, iva, total) VALUES ($1, $2, $3, $4) RETURNING id',
      [cliente_id, subtotal, iva, total]
    );
    const cotizacion_id = cotizacionRes.rows[0].id;

    // Guardar cada producto en el detalle
    for (let item of detalles) {
      await client.query(
        'INSERT INTO detalle_cotizaciones (cotizacion_id, producto_sku, nombre, cantidad, precio_venta) VALUES ($1, $2, $3, $4, $5)',
        [cotizacion_id, item.producto_sku || null, item.nombre, item.cantidad, item.precio_venta]
      );
    }

    await client.query('COMMIT'); // Confirma y guarda todo en la base de datos
    res.json({ mensaje: 'Cotización creada con éxito', id: cotizacion_id });
  } catch (err) {
    await client.query('ROLLBACK'); // Si algo falla, deshace todo para no dejar datos corruptos
    console.error(err.message);
    res.status(500).send('Error al crear cotización');
  } finally {
    client.release();
  }
});
// Catch-all: servir index.html para cualquier ruta no-API
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ═══════════ INICIALIZAR TABLAS (para deploy en nube) ═══════════
// En la nube no existe init.sql, así que creamos las tablas al iniciar
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        rut VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255),
        empresa VARCHAR(255)
      );
      CREATE TABLE IF NOT EXISTS productos (
        codigo_sku VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio_base DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        subtotal DECIMAL(10, 2) NOT NULL,
        iva DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS detalle_cotizaciones (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id) ON DELETE CASCADE,
        producto_sku VARCHAR(50),
        nombre VARCHAR(255),
        cantidad INTEGER NOT NULL,
        precio_venta DECIMAL(10, 2) NOT NULL
      );
      
      ALTER TABLE detalle_cotizaciones ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);
      ALTER TABLE detalle_cotizaciones DROP CONSTRAINT IF EXISTS detalle_cotizaciones_producto_sku_fkey;
    `);
    console.log('✅ Tablas verificadas/creadas correctamente');
  } catch (err) {
    console.error('⚠️ Error al inicializar tablas:', err.message);
  }
}

// Encender el servidor
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CotizaPro corriendo en http://localhost:${PORT}`);
  });
});