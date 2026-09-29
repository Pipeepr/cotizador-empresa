const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://admin:adminpassword@localhost:5432/cotizador_db',
});

async function run() {
  try {
    // 1. Alter cotizaciones table
    await pool.query("ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'Borrador'");
    
    // 2. Create notas_venta table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas_venta (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id),
        numero VARCHAR(50) UNIQUE NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total DECIMAL(10, 2) NOT NULL,
        pdf_url TEXT
      );
    `);

    // 3. Create historial_estados table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historial_estados (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id),
        estado_anterior VARCHAR(50),
        estado_nuevo VARCHAR(50) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario VARCHAR(100)
      );
    `);

    // 4. Create envios_correo table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS envios_correo (
        id SERIAL PRIMARY KEY,
        cotizacion_id INTEGER REFERENCES cotizaciones(id),
        destinatario VARCHAR(255) NOT NULL,
        asunto VARCHAR(255) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database updated successfully');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
