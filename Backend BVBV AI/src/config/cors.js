const allowedOrigins = [
  'http://localhost:3000',  // Desenvolvimento local
  'https://lovable.app',    // Domínio de produção do Lovable
  'https://www.lovable.app',
  'https://lovable.com',    // Domínios alternativos
  'https://www.lovable.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origem (como aplicativos móveis, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política CORS para este site não permite acesso a partir da origem especificada.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Auth-Token',
    'Accept',
    'X-CSRF-Token',
    'X-API-Version'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Content-Disposition',
    'X-Filename'
  ],
  maxAge: 3600
};

module.exports = corsOptions;
