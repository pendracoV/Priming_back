require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const evaluadorRoutes = require('./routes/evaluadorRoutes');
const ninoRoutes = require('./routes/ninoRoutes');
const juegoRoutes = require('./routes/juegoRoutes');
const encuestaRoutes = require('./routes/encuestaRoutes');

// Importar manejador de errores
const errorHandler = require('./utils/errorHandler');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Rutas
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/evaluador', evaluadorRoutes);
app.use('/api/nino', ninoRoutes);
app.use('/api/juegos', juegoRoutes);
app.use('/api/encuestas', encuestaRoutes);

// Ruta de prueba
app.get('/api/status', (req, res) => {
  res.json({ message: '🚀 API de PRIMING funcionando correctamente' });
});

// Middleware de manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));