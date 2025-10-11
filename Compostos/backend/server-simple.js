const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Conectado ao MongoDB');
})
.catch(err => {
  console.error('Erro na conexão com MongoDB:', err);
});

// Rotas básicas
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Compostos - Servidor Simplificado',
    status: 'online'
  });
});

// Incluir rotas de bônus de liderança
app.use('/api/leadership-bonuses', require('./routes/leadershipBonuses'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor simplificado rodando na porta ${PORT}`);
});