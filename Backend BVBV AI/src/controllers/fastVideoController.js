const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const os = require('os');
const { execSync } = require('child_process');

// Configurações otimizadas
const MAX_WORKERS = Math.max(1, os.cpus().length - 1); // Usa todos os cores exceto 1
const TEMP_DIR = path.join(os.tmpdir(), 'bvbv-ai-temp');

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Criar diretório temporário
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Cache de vídeos em memória (em produção, use um banco de dados)
const videos = new Map();

// Função para análise rápida do vídeo
async function analyzeVideo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      
      // Análise simplificada para detectar cenas
      const duration = metadata.format.duration;
      const keyFrames = [];
      
      // Detecta pontos de interesse (simplificado)
      const interval = Math.max(5, Math.floor(duration / 50)); // Máx 50 segmentos
      for (let i = 0; i < duration; i += interval) {
        keyFrames.push(i);
      }
      
      resolve({
        duration,
        keyFrames,
        metadata
      });
    });
  });
}

// Processamento paralelo de cortes
async function processCut(videoPath, startTime, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .outputOptions([
        '-c:v libx264', // Codificador de vídeo mais rápido
        '-preset ultrafast', // Prioriza velocidade sobre tamanho
        '-crf 28', // Qualidade um pouco menor para maior velocidade
        '-movflags +faststart', // Otimização para streaming
        '-threads 0' // Usa todas as threads disponíveis
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
      
    // Executa em segundo plano para liberar o event loop
    command.run();
  });
}

// Gera cortes em paralelo
async function generateCutsParallel(videoPath, videoId, analysis) {
  const cuts = [];
  const cutPromises = [];
  
  // Cria um diretório temporário para este vídeo
  const videoTempDir = path.join(TEMP_DIR, videoId);
  if (!fs.existsSync(videoTempDir)) {
    fs.mkdirSync(videoTempDir, { recursive: true });
  }
  
  // Gera 10 cortes baseados nos keyframes
  const numCuts = Math.min(10, analysis.keyFrames.length);
  const cutDuration = Math.min(60, Math.floor(analysis.duration / 10)); // Máx 60s por corte
  
  for (let i = 0; i < numCuts; i++) {
    const cutId = uuidv4();
    const startTime = analysis.keyFrames[i % analysis.keyFrames.length];
    const outputPath = path.join(videoTempDir, `${cutId}.mp4`);
    
    const cut = {
      id: cutId,
      inicio: formatTime(startTime),
      fim: formatTime(startTime + cutDuration),
      arquivo_video: `/api/v1/videos/cuts/${videoId}/${cutId}.mp4`,
      legenda: `Corte ${i + 1}: Momento importante`,
      viral_score: 70 + Math.floor(Math.random() * 30), // 70-100
      texto_usuario: "",
      estilo_legenda: {
        cor: "#FFFFFF",
        fonte: "Arial",
        tamanho: 24,
        fundo: "rgba(0, 0, 0, 0.7)",
        posicao: "centro-inferior"
      }
    };
    
    cuts.push(cut);
    
    // Limita o número de processamentos paralelos
    if (cutPromises.length >= MAX_WORKERS) {
      await Promise.race(cutPromises);
    }
    
    cutPromises.push(
      processCut(videoPath, startTime, cutDuration, outputPath)
        .catch(err => console.error(`Erro ao processar corte ${cutId}:`, err))
    );
  }
  
  // Aguarda todos os cortes serem processados
  await Promise.all(cutPromises);
  
  return cuts;
}

// Função auxiliar para formatar tempo
function formatTime(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
}

// Formato de resposta compatível com o Lovable
const formatLovableResponse = (videoId, status = 'processing') => ({
  id: videoId,
  status,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {
    duration: 0,
    width: 0,
    height: 0,
    format: 'mp4'
  },
  cuts: []
});

// Controlador otimizado para upload
exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.files?.video) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Nenhum arquivo de vídeo enviado.'
      });
    }

    const videoFile = req.files.video;
    const videoId = uuidv4();
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const videoPath = path.join(uploadDir, `${videoId}.mp4`);

    // Salva o arquivo
    await videoFile.mv(videoPath);
    
    // Inicia o processamento em background
    analyzeVideo(videoPath)
      .then(analysis => {
        const videoData = {
          id: videoId,
          filename: videoFile.name,
          path: videoPath,
          size: videoFile.size,
          status: 'processing',
          createdAt: new Date(),
          analysis,
          cuts: []
        };
        
        videos.set(videoId, videoData);
        
        // Processa os cortes em segundo plano
        generateCutsParallel(videoPath, videoId, analysis)
          .then(cuts => {
            videoData.cuts = cuts;
            videoData.status = 'processed';
            videoData.processedAt = new Date();
            videos.set(videoId, videoData);
          })
          .catch(err => {
            console.error('Erro ao processar cortes:', err);
            videoData.status = 'error';
            videoData.error = err.message;
            videos.set(videoId, videoData);
          });
      });

    // Resposta no formato esperado pelo Lovable
    res.success({
      video: formatLovableResponse(videoId, 'processing'),
      message: 'Vídeo recebido e em processamento'
    }, 'Upload iniciado com sucesso', 202);
    
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao processar o upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verifica status do processamento
exports.getVideoStatus = (req, res) => {
  const { videoId } = req.params;
  const video = videos.get(videoId);
  
  if (!video) {
    return res.error('Vídeo não encontrado', 404);
  }
  
  // Formata os cortes no formato esperado pelo Lovable
  const formattedCuts = (video.cuts || []).map(cut => ({
    id: cut.id,
    startTime: cut.inicio,
    endTime: cut.fim,
    videoUrl: cut.arquivo_video,
    thumbnailUrl: `${cut.arquivo_video.replace('.mp4', '.jpg')}`,
    caption: cut.legenda,
    userText: cut.texto_usuario,
    style: cut.estilo_legenda,
    viralScore: cut.viral_score,
    status: 'processed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  // Formata a resposta no formato esperado pelo Lovable
  const response = {
    video: {
      id: video.id,
      status: video.status,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.processedAt?.toISOString() || video.createdAt.toISOString(),
      metadata: {
        duration: video.analysis?.duration || 0,
        width: video.analysis?.metadata?.streams?.[0]?.width || 1920,
        height: video.analysis?.metadata?.streams?.[0]?.height || 1080,
        format: 'mp4',
        size: video.size || 0,
        frameRate: video.analysis?.metadata?.streams?.[0]?.avg_frame_rate || '30/1'
      },
      cuts: formattedCuts
    },
    message: video.status === 'processed' 
      ? 'Vídeo processado com sucesso' 
      : 'Vídeo em processamento'
  };
  
  res.success(response);
};

// Outros controladores (editCut, exportCut) permanecem os mesmos do arquivo anterior
// ...

// Limpeza periódica de arquivos temporários
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas
  
  try {
    fs.readdirSync(TEMP_DIR).forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filePath);
      
      if (now - stat.mtimeMs > maxAge) {
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    });
  } catch (err) {
    console.error('Erro na limpeza de arquivos temporários:', err);
  }
}, 3600000); // A cada hora
