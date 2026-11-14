const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal - muestra la web del hotel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API de prueba
app.get('/api/test', (req, res) => {
  res.json({ mensaje: 'HogwartsHotel funcionando!', hotel: 'Hotel Mauro' });
});

app.listen(PORT, () => {
  console.log(`HogwartsHotel corriendo en puerto ${PORT}`);
});
