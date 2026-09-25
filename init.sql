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
    producto_sku VARCHAR(50) REFERENCES productos(codigo_sku),
    cantidad INTEGER NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL
);