const API = 'http://localhost:3000';

async function cargarDatos() {
    try {
        // Inyectando Clientes de prueba
        await fetch(`${API}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: "Rodrigo Pereira", rut: "18.123.456-7", email: "contacto@tornometal.cl", empresa: "Tornometal" })
        });
        await fetch(`${API}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: "Administración", rut: "76.555.444-3", email: "ventas@emilystore.cl", empresa: "Emily Store" })
        });

        // Inyectando Productos de prueba
        await fetch(`${API}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_sku: "SRV-001", nombre: "Mantención Grúa Horquilla Toyota", precio_base: 150000, stock: 1 })
        });
        await fetch(`${API}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_sku: "PIEZA-002", nombre: "Eje de Acero Torneado CNC", precio_base: 45000, stock: 10 })
        });

        console.log("✅ Datos de prueba creados. ¡Ve a tu navegador y recarga la página!");
    } catch (error) {
        console.log("Error de conexión. Revisa que tu archivo index.js siga corriendo en la otra terminal.");
    }
}

cargarDatos();