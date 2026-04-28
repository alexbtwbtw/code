module.exports = {
  apps: [{
    name: 'dinaxis',
    script: './dist/server.js',
    cwd: '/app-dinaxis',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: '3002',
      STORAGE: 's3',
      AWS_REGION: 'eu-west-2',
      // DATABASE_URL and S3_FILES_BUCKET are injected via .env file by the deploy script
    },
    env_file: '/app-dinaxis/.env',
    error_file: '/var/log/dinaxis/error.log',
    out_file: '/var/log/dinaxis/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}
