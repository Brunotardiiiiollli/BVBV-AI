require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Importar rotas
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Criar diretórios necessários
const uploadsDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed');

[uploadsDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  abortOnLimit: true,
  responseOnLimit: 'O tamanho do arquivo excede o limite de 1GB',
}));
app.use(morgan('dev'));

// Rotas
app.use('/api/v1', videoRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'BVBV AI API está funcionando!',
    version: '1.0.0'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Algo deu errado!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
