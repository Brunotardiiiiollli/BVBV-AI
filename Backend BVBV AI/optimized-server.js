require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const path = require('path');
const os = require('os');
const cluster = require('cluster');
const numCPUs = os.cpus().length;
const fastVideoController = require('./src/controllers/fastVideoController');
const corsOptions = require('./src/config/cors');
const lovableCompatibility = require('./src/middleware/lovableCompatibility');

// Configuração do cluster para melhor desempenho
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  console.log(`Master ${process.pid} is running`);
  
  // Inicializa workers
  for (let i = 0; i < Math.max(1, numCPUs - 1); i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
  
} else {
  const app = express();
  const PORT = process.env.PORT || 5000;
  
  // Middlewares otimizados
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Middleware de compatibilidade com Lovable
  app.use(lovableCompatibility);
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
    abortOnLimit: true,
    responseOnLimit: 'O tamanho do arquivo excede o limite de 1GB',
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }));
  
  // Logs apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
  
  // Rotas da API compatíveis com Lovable
  app.post('/api/v1/upload-video', (req, res, next) => {
    console.log('Recebendo upload de vídeo do Lovable');
    next();
  }, fastVideoController.uploadVideo);
  
  app.get('/api/v1/video-status/:videoId', fastVideoController.getVideoStatus);
  
  // Rota de saúde para o frontend verificar a conexão
  app.get('/api/v1/health', (req, res) => {
    res.success({
      status: 'online',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }, 'BVBV AI API está funcionando corretamente');
  });
  
  // Rota de status
  app.get('/status', (req, res) => {
    res.json({
      status: 'online',
      worker: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    });
  });
  
  // Tratamento de erros
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      status: 'error',
      message: 'Algo deu errado!',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  });
  
  // Iniciar servidor
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Worker ${process.pid} iniciado na porta ${PORT}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Memória total: ${os.totalmem() / (1024 * 1024 * 1024)}GB`);
    console.log(`CPUs: ${numCPUs}`);
  });
  
  // Configurações de timeout
  server.keepAliveTimeout = 30000;
  server.headersTimeout = 35000;
  
  // Gerenciamento de erros não tratados
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Rejeição não tratada em:', promise, 'motivo:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Exceção não capturada:', error);
    process.exit(1);
  });
}
