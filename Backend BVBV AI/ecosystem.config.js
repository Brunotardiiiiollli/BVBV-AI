module.exports = {
  apps: [{
    name: 'bvbv-ai',
    script: './optimized-server.js',
    instances: 'max',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
