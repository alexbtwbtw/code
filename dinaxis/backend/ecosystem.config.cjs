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
      DATABASE_URL: '/data/dinaxis.db',
      STORAGE: 's3',
      AWS_REGION: 'eu-west-2',
    },
    error_file: '/var/log/dinaxis/error.log',
    out_file: '/var/log/dinaxis/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}
