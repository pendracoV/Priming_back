require('dotenv').config();
const { Pool } = require('pg');

// Configurar conexión con PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión exitosa a PostgreSQL');
        
        const res = await client.query('SELECT NOW()');
        console.log('📅 Fecha y hora del servidor:', res.rows[0].now);

        client.release();
    } catch (error) {
        console.error('❌ Error al conectar a PostgreSQL:', error.message);
    } finally {
        pool.end();
    }
}

// Ejecutar la función correctamente
checkConnection();
