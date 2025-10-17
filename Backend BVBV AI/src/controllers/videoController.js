const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

// Configurar caminhos do FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Armazenamento em memória (substituir por banco de dados em produção)
const videos = new Map();

// Função para analisar vídeo e extrair metadados
const analyzeVideo = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
};

// Função para gerar cortes automáticos
const generateAutoCuts = async (videoPath, videoId) => {
  // Esta é uma implementação de exemplo simplificada
  // Em produção, você usaria análise de vídeo/áudio mais sofisticada
  
  const cuts = [];
  const tempDir = path.join(__dirname, '..', 'temp', videoId);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Gerar 10 cortes de exemplo
  for (let i = 0; i < 10; i++) {
    const cutId = uuidv4();
    const startTime = i * 10; // Exemplo: cortes a cada 10 segundos
    const duration = 15 + Math.floor(Math.random() * 45); // Entre 15 e 60 segundos
    const outputPath = path.join(tempDir, `${cutId}.mp4`);
    
    // Em produção, use análise de vídeo/áudio para determinar os melhores cortes
    const cut = {
      id: cutId,
      inicio: formatTime(startTime),
      fim: formatTime(startTime + duration),
      arquivo_video: `/api/v1/videos/cuts/${videoId}/${cutId}.mp4`,
      legenda: `Corte automático ${i + 1}: Momento importante detectado`,
      viral_score: Math.floor(Math.random() * 100),
      texto_usuario: "",
      estilo_legenda: {
        cor: "#FFFFFF",
        fonte: "Arial",
        tamanho: 24,
        fundo: "rgba(0, 0, 0, 0.7)",
        posicao: "centro-inferior"
      }
    };
    
    // Processar o corte do vídeo (implementação simplificada)
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
    
    cuts.push(cut);
  }
  
  return cuts;
};

// Função auxiliar para formatar tempo (segundos para HH:MM:SS)
const formatTime = (seconds) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
};

// Controlador para upload de vídeo
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Nenhum arquivo de vídeo enviado.'
      });
    }

    const videoFile = req.files.video;
    const videoId = uuidv4();
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const videoPath = path.join(uploadDir, `${videoId}.mp4`);

    // Mover o arquivo para o diretório de uploads
    await videoFile.mv(videoPath);

    // Analisar metadados do vídeo
    const metadata = await analyzeVideo(videoPath);
    
    // Armazenar informações do vídeo
    const videoData = {
      id: videoId,
      filename: videoFile.name,
      path: videoPath,
      size: videoFile.size,
      mimetype: videoFile.mimetype,
      metadata,
      status: 'uploaded',
      createdAt: new Date(),
      cuts: []
    };
    
    videos.set(videoId, videoData);

    res.status(200).json({
      status: 'success',
      message: 'Vídeo enviado com sucesso',
      data: {
        videoId,
        path: `/api/v1/videos/${videoId}`
      }
    });
  } catch (error) {
    console.error('Erro ao fazer upload do vídeo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao processar o upload do vídeo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controlador para processar vídeo e gerar cortes
exports.processVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    if (!videos.has(videoId)) {
      return res.status(404).json({
        status: 'error',
        message: 'Vídeo não encontrado'
      });
    }
    
    const videoData = videos.get(videoId);
    
    // Verificar se o vídeo já foi processado
    if (videoData.status === 'processed') {
      return res.status(200).json({
        status: 'success',
        message: 'Vídeo já processado',
        data: {
          cuts: videoData.cuts
        }
      });
    }
    
    // Gerar cortes automáticos
    const cuts = await generateAutoCuts(videoData.path, videoId);
    
    // Atualizar dados do vídeo
    videoData.cuts = cuts;
    videoData.status = 'processed';
    videoData.processedAt = new Date();
    
    videos.set(videoId, videoData);
    
    res.status(200).json({
      status: 'success',
      message: 'Vídeo processado com sucesso',
      data: { cuts }
    });
    
  } catch (error) {
    console.error('Erro ao processar vídeo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao processar o vídeo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controlador para editar um corte
exports.editCut = async (req, res) => {
  try {
    const { videoId, cutId } = req.params;
    const updates = req.body;
    
    if (!videos.has(videoId)) {
      return res.status(404).json({
        status: 'error',
        message: 'Vídeo não encontrado'
      });
    }
    
    const videoData = videos.get(videoId);
    const cutIndex = videoData.cuts.findIndex(cut => cut.id === cutId);
    
    if (cutIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Corte não encontrado'
      });
    }
    
    // Atualizar dados do corte
    videoData.cuts[cutIndex] = {
      ...videoData.cuts[cutIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    videos.set(videoId, videoData);
    
    res.status(200).json({
      status: 'success',
      message: 'Corte atualizado com sucesso',
      data: {
        cut: videoData.cuts[cutIndex]
      }
    });
    
  } catch (error) {
    console.error('Erro ao editar corte:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao editar o corte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Controlador para exportar um corte
exports.exportCut = async (req, res) => {
  try {
    const { videoId, cutId } = req.params;
    
    if (!videos.has(videoId)) {
      return res.status(404).json({
        status: 'error',
        message: 'Vídeo não encontrado'
      });
    }
    
    const videoData = videos.get(videoId);
    const cut = videoData.cuts.find(c => c.id === cutId);
    
    if (!cut) {
      return res.status(404).json({
        status: 'error',
        message: 'Corte não encontrado'
      });
    }
    
    // Em produção, você geraria um link de download ou faria o upload para um CDN
    // Esta é uma implementação simplificada
    const tempDir = path.join(__dirname, '..', 'temp', videoId);
    const cutPath = path.join(tempDir, `${cutId}.mp4`);
    
    if (!fs.existsSync(cutPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Arquivo do corte não encontrado'
      });
    }
    
    // Definir cabeçalhos para download
    res.download(cutPath, `corte-${cutId}.mp4`, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
        res.status(500).json({
          status: 'error',
          message: 'Erro ao baixar o corte'
        });
      }
    });
    
  } catch (error) {
    console.error('Erro ao exportar corte:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao exportar o corte',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
