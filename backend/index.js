const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const GOOGLE_CLIENT_ID = '360557152471-b270feg6rv0nm39l04geqjkjlosbtv3n.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for HTML payload
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_cotizapro_2026';

// Middleware de API
function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// Middleware de vistas
function requireAuthView(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.redirect('/login');
    }
}

// Rutas de vistas
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});

app.get('/', requireAuthView, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});
app.get('/index.html', requireAuthView, (req, res) => {
    res.redirect('/');
});

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

// ═══════════ AUTENTICACIÓN ═══════════
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const user = userRes.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
        res.cookie('token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict',
            maxAge: 12 * 60 * 60 * 1000 
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        // --- LISTA DE CORREOS PERMITIDOS ---
        // Puedes agregar más correos separándolos con comas.
        const CORREOS_PERMITIDOS = [
            'misteryfelipe@gmail.com'
        ];

        if (!CORREOS_PERMITIDOS.includes(email)) {
            return res.status(401).json({ error: 'Acceso denegado. Este correo no tiene autorización.' });
        }

        // Upsert user based on google email
        let userRes = await pool.query('SELECT * FROM usuarios WHERE username = $1', [email]);
        let user;
        if (userRes.rows.length === 0) {
            // Register new google user
            const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);
            const insertRes = await pool.query(
                'INSERT INTO usuarios (username, password) VALUES ($1, $2) RETURNING *',
                [email, dummyPassword]
            );
            user = insertRes.rows[0];
        } else {
            user = userRes.rows[0];
        }

        const jwtToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
        res.cookie('token', jwtToken, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'strict',
            maxAge: 12 * 60 * 60 * 1000 
        });
        res.json({ success: true, email });
    } catch (err) {
        console.error('Error verifying google token', err);
        res.status(401).json({ error: 'Token de Google inválido' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/check-auth', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

// Endpoint 1: OBTENER todos los clientes
app.get('/clientes', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});

// Endpoint 2: CREAR un nuevo cliente
app.post('/clientes', requireAuth, async (req, res) => {
  const { nombre, rut, email, empresa, contacto, direccion, comuna, ciudad, giro } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombre, rut, email, empresa, contacto, direccion, comuna, ciudad, giro) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [nombre, rut, email, empresa, contacto, direccion, comuna, ciudad, giro]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al crear el cliente');
  }
});

// Endpoint 2.5: ACTUALIZAR un cliente
app.put('/clientes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, rut, email, empresa, contacto, direccion, comuna, ciudad, giro } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nombre = $1, rut = $2, email = $3, empresa = $4, contacto = $5, direccion = $6, comuna = $7, ciudad = $8, giro = $9 WHERE id = $10 RETURNING *',
      [nombre, rut, email, empresa, contacto, direccion, comuna, ciudad, giro, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// Endpoint 2.1: ELIMINAR un cliente
app.delete('/clientes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') {
       return res.status(400).json({ error: 'No se puede eliminar este cliente porque ya tiene cotizaciones guardadas. Debes eliminar las cotizaciones primero.' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// 3. OBTENER todos los productos
app.get('/productos', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Error al obtener productos');
  }
});

// 4. CREAR un producto
app.post('/productos', requireAuth, async (req, res) => {
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
app.post('/cotizaciones', requireAuth, async (req, res) => {
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

// 6. ACTUALIZAR cotización existente (solo si está en Borrador)
app.put('/cotizaciones/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { cliente_id, subtotal, iva, total, detalles } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if it exists and is Borrador
    const checkRes = await client.query('SELECT estado FROM cotizaciones WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) throw new Error('Cotización no encontrada');
    if (checkRes.rows[0].estado !== 'Borrador') throw new Error('Solo se pueden editar cotizaciones en Borrador');

    await client.query(
      'UPDATE cotizaciones SET cliente_id = $1, subtotal = $2, iva = $3, total = $4, fecha = CURRENT_TIMESTAMP WHERE id = $5',
      [cliente_id, subtotal, iva, total, id]
    );

    // Replace details
    await client.query('DELETE FROM detalle_cotizaciones WHERE cotizacion_id = $1', [id]);
    for (let item of detalles) {
      await client.query(
        'INSERT INTO detalle_cotizaciones (cotizacion_id, producto_sku, nombre, cantidad, precio_venta) VALUES ($1, $2, $3, $4, $5)',
        [id, item.producto_sku || null, item.nombre, item.cantidad, item.precio_venta]
      );
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Cotización actualizada con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send(err.message || 'Error al actualizar cotización');
  } finally {
    client.release();
  }
});

// 6.5 ELIMINAR cotización
app.delete('/cotizaciones/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if it exists
    const checkRes = await client.query('SELECT id FROM cotizaciones WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) throw new Error('Cotización no encontrada');

    // Delete related records manually to avoid foreign key constraint errors
    await client.query('DELETE FROM detalle_cotizaciones WHERE cotizacion_id = $1', [id]);
    await client.query('DELETE FROM historial_estados WHERE cotizacion_id = $1', [id]);
    await client.query('DELETE FROM envios_correo WHERE cotizacion_id = $1', [id]);
    await client.query('DELETE FROM notas_venta WHERE cotizacion_id = $1', [id]);
    
    // Delete main record
    await client.query('DELETE FROM cotizaciones WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Cotización eliminada con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send(err.message || 'Error al eliminar cotización');
  } finally {
    client.release();
  }
});

// 7. ACTUALIZAR estado de cotización
app.put('/cotizaciones/:id/estado', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const usuario = req.user?.username || 'Sistema';
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldStateRes = await client.query('SELECT estado FROM cotizaciones WHERE id = $1', [id]);
    if (oldStateRes.rows.length === 0) throw new Error('Cotización no encontrada');
    const estado_anterior = oldStateRes.rows[0].estado;

    await client.query('UPDATE cotizaciones SET estado = $1 WHERE id = $2', [estado, id]);
    
    await client.query(
      'INSERT INTO historial_estados (cotizacion_id, estado_anterior, estado_nuevo, usuario) VALUES ($1, $2, $3, $4)',
      [id, estado_anterior, estado, usuario]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send('Error al actualizar estado');
  } finally {
    client.release();
  }
});

// 8. ENVIAR cotización por correo
app.post('/cotizaciones/:id/enviar', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { destinatario, asunto, mensaje, html, googleToken, googleEmail } = req.body;
  const usuario = req.user?.username || 'Sistema';

  if (!destinatario || !asunto || !html) {
    return res.status(400).send('Faltan datos requeridos (destinatario, asunto o html)');
  }

  const client = await pool.connect();
  let browser;
  try {
    // 1. Generar PDF con Puppeteer
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    
    // 2. Configurar Nodemailer
    let transporter;
    if (googleToken && googleEmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: googleEmail,
          accessToken: googleToken
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    // 3. Enviar correo
    const mailOptions = {
      from: googleEmail || process.env.SMTP_FROM || '"Cotizador Empresa" <no-reply@cotizador.com>',
      to: destinatario,
      subject: asunto,
      text: mensaje || 'Adjunto enviamos la cotización.',
      attachments: [{
        filename: `Cotizacion_COT-${String(id).padStart(4, '0')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    await transporter.sendMail(mailOptions);

    // 4. Actualizar BD
    await client.query('BEGIN');
    
    // Registrar el envío
    await client.query(
      'INSERT INTO envios_correo (cotizacion_id, destinatario, asunto) VALUES ($1, $2, $3)',
      [id, destinatario, asunto]
    );

    // Actualizar estado si estaba en Borrador
    const oldStateRes = await client.query('SELECT estado FROM cotizaciones WHERE id = $1', [id]);
    if (oldStateRes.rows.length > 0) {
      const estado_anterior = oldStateRes.rows[0].estado;
      if (estado_anterior === 'Borrador') {
        await client.query("UPDATE cotizaciones SET estado = 'Enviada' WHERE id = $1", [id]);
        await client.query(
          'INSERT INTO historial_estados (cotizacion_id, estado_anterior, estado_nuevo, usuario) VALUES ($1, $2, $3, $4)',
          [id, estado_anterior, 'Enviada', usuario]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Correo enviado correctamente y estado actualizado' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Error al enviar correo: ' + err.message);
  } finally {
    if (browser) await browser.close();
    client.release();
  }
});

// 9. GENERAR Nota de Venta
app.post('/cotizaciones/:id/nota-venta', requireAuth, async (req, res) => {
  const { id } = req.params;
  const usuario = req.user?.username || 'Sistema';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Obtener cotización
    const cotRes = await client.query('SELECT total, estado FROM cotizaciones WHERE id = $1', [id]);
    if (cotRes.rows.length === 0) throw new Error('Cotización no encontrada');
    
    const { total, estado } = cotRes.rows[0];
    
    if (estado === 'Nota de Venta' || estado === 'Facturada' || estado === 'Completada') {
      throw new Error('La cotización ya tiene una nota de venta generada');
    }

    // Generar numero correlativo NV-XXXX
    const countRes = await client.query('SELECT COUNT(*) FROM notas_venta');
    const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
    const numero = `NV-${String(nextNum).padStart(4, '0')}`;

    // Crear la nota de venta
    await client.query(
      'INSERT INTO notas_venta (cotizacion_id, numero, total) VALUES ($1, $2, $3)',
      [id, numero, total]
    );

    // Actualizar estado de la cotización
    await client.query("UPDATE cotizaciones SET estado = 'Nota de Venta' WHERE id = $1", [id]);

    // Registrar historial
    await client.query(
      'INSERT INTO historial_estados (cotizacion_id, estado_anterior, estado_nuevo, usuario) VALUES ($1, $2, $3, $4)',
      [id, estado, 'Nota de Venta', usuario]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Nota de Venta generada exitosamente', numero });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send(err.message || 'Error al generar Nota de Venta');
  } finally {
    client.release();
  }
});

// 10. OBTENER historial de cotizaciones
app.get('/cotizaciones', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.fecha, c.total, c.estado, cl.nombre AS cliente_nombre, cl.empresa AS cliente_empresa
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      ORDER BY c.fecha DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al obtener cotizaciones');
  }
});

// 11. OBTENER una cotización específica con sus detalles
app.get('/cotizaciones/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const cotRes = await pool.query(`
      SELECT c.*, cl.nombre AS cliente_nombre, cl.rut AS cliente_rut, cl.email AS cliente_email, 
             cl.empresa AS cliente_empresa, cl.contacto AS cliente_contacto, cl.direccion AS cliente_direccion,
             nv.numero AS nota_venta_numero
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN notas_venta nv ON nv.cotizacion_id = c.id
      WHERE c.id = $1
    `, [id]);
    
    if (cotRes.rows.length === 0) return res.status(404).send('No encontrada');
    
    const detRes = await pool.query('SELECT * FROM detalle_cotizaciones WHERE cotizacion_id = $1', [id]);
    const histRes = await pool.query('SELECT * FROM historial_estados WHERE cotizacion_id = $1 ORDER BY fecha DESC', [id]);
    
    res.json({ 
      ...cotRes.rows[0], 
      detalles: detRes.rows,
      historial_estados: histRes.rows
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error al obtener la cotización');
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
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        rut VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255),
        empresa VARCHAR(255),
        contacto VARCHAR(255),
        direccion VARCHAR(255)
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
        total DECIMAL(10, 2) NOT NULL,
        estado VARCHAR(50) DEFAULT 'Borrador'
      );
      CREATE TABLE IF NOT EXISTS detalle_cotizaciones (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id) ON DELETE CASCADE,
        producto_sku VARCHAR(50),
        nombre VARCHAR(255),
        cantidad INTEGER NOT NULL,
        precio_venta DECIMAL(10, 2) NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS notas_venta (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id),
        numero VARCHAR(50) UNIQUE NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total DECIMAL(10, 2) NOT NULL,
        pdf_url TEXT
      );

      CREATE TABLE IF NOT EXISTS historial_estados (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id),
        estado_anterior VARCHAR(50),
        estado_nuevo VARCHAR(50) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS envios_correo (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id),
        destinatario VARCHAR(255) NOT NULL,
        asunto VARCHAR(255) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'Borrador';
      ALTER TABLE detalle_cotizaciones ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);
      ALTER TABLE detalle_cotizaciones DROP CONSTRAINT IF EXISTS detalle_cotizaciones_producto_sku_fkey;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contacto VARCHAR(255);
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS comuna VARCHAR(255);
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad VARCHAR(255);
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS giro VARCHAR(255);
    `);
    
    // Seed admin if not exists
    const adminCheck = await pool.query('SELECT * FROM usuarios WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(process.env.ADMIN_PASS || 'Tornometal2026', salt);
        await pool.query('INSERT INTO usuarios (username, password) VALUES ($1, $2)', ['admin', hash]);
    }

    console.log('✅ Tablas verificadas/creadas correctamente');
  } catch (err) {
    console.error('⚠️ Error al inicializar tablas:', err.stack || err);
  }
}

// Encender el servidor
const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CotizaPro corriendo en http://localhost:${PORT}`);
  });
});