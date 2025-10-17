const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { check } = require('express-validator');
const fileUpload = require('express-fileupload');

// Middleware para upload de arquivos
router.use(fileUpload());

// Rota para upload de vídeo
router.post('/upload-video', 
  // Validação básica
  [
    check('video', 'O arquivo de vídeo é obrigatório')
      .custom((value, { req }) => {
        if (!req.files || !req.files.video) {
          throw new Error('Nenhum arquivo de vídeo enviado');
        }
        return true;
      })
  ],
  videoController.uploadVideo
);

// Rota para processar vídeo e gerar cortes
router.post('/process-video/:videoId', 
  [
    check('videoId', 'ID do vídeo é obrigatório').notEmpty()
  ],
  videoController.processVideo
);

// Rota para editar um corte específico
router.put('/edit-cut/:videoId/:cutId', 
  [
    check('videoId', 'ID do vídeo é obrigatório').notEmpty(),
    check('cutId', 'ID do corte é obrigatório').notEmpty(),
    check('legenda', 'A legenda é opcional, mas deve ser uma string').optional().isString(),
    check('texto_usuario', 'O texto do usuário é opcional, mas deve ser uma string').optional().isString(),
    check('estilo_legenda', 'O estilo da legenda deve ser um objeto').optional().isObject()
  ],
  videoController.editCut
);

// Rota para exportar um corte
router.get('/export-cut/:videoId/:cutId', 
  [
    check('videoId', 'ID do vídeo é obrigatório').notEmpty(),
    check('cutId', 'ID do corte é obrigatório').notEmpty()
  ],
  videoController.exportCut
);

// Rota para obter informações de um vídeo
router.get('/videos/:videoId', 
  [
    check('videoId', 'ID do vídeo é obrigatório').notEmpty()
  ],
  (req, res) => {
    // Implementação simplificada - em produção, isso viria de um banco de dados
    const video = videos.get(req.params.videoId);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        message: 'Vídeo não encontrado'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        video: {
          id: video.id,
          status: video.status,
          createdAt: video.createdAt,
          processedAt: video.processedAt,
          cuts: video.cuts.map(cut => ({
            id: cut.id,
            inicio: cut.inicio,
            fim: cut.fim,
            viral_score: cut.viral_score,
            legenda: cut.legenda,
            texto_usuario: cut.texto_usuario,
            estilo_legenda: cut.estilo_legenda
          }))
        }
      }
    });
  }
);

// Rota para servir arquivos de vídeo (acesso público)
router.get('/videos/cuts/:videoId/:cutId', (req, res) => {
  const { videoId, cutId } = req.params;
  const cutPath = path.join(__dirname, '..', 'temp', videoId, `${cutId}.mp4`);
  
  if (!fs.existsSync(cutPath)) {
    return res.status(404).json({
      status: 'error',
      message: 'Arquivo não encontrado'
    });
  }
  
  res.sendFile(cutPath);
});

// Rota para listar todos os vídeos (apenas para desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  router.get('/videos', (req, res) => {
    const videoList = Array.from(videos.values()).map(video => ({
      id: video.id,
      filename: video.filename,
      size: video.size,
      status: video.status,
      createdAt: video.createdAt,
      cuts: video.cuts ? video.cuts.length : 0
    }));
    
    res.status(200).json({
      status: 'success',
      results: videoList.length,
      data: {
        videos: videoList
      }
    });
  });
}

module.exports = router;
