module.exports = {
  apps: [{
    name: 'coba-backend',
    script: './dist/server.js',
    cwd: '/app',
    env: {
      NODE_ENV: 'production',
      PORT: '3000',
      USE_REAL_AI: 'false',
      AWS_REGION: 'eu-west-2',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/coba/err.log',
    out_file: '/var/log/coba/out.log',
    max_memory_restart: '800M',
  }]
}
