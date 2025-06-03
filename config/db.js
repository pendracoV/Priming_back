const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Función para ejecutar consultas
const query = (text, params) => pool.query(text, params);

// Función para obtener un cliente de la pool (útil para transacciones)
const getClient = async () => {
    const client = await pool.connect();
    const originalRelease = client.release;

    // Sobreescribe el método release para permitir seguimiento
    client.release = () => {
        originalRelease.apply(client);
    };

    return client;
};

module.exports = {
    query,
    getClient
};