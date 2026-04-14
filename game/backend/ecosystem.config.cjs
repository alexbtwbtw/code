module.exports = {
  apps: [{
    name: 'game-backend',
    script: './dist/server.js',
    cwd: '/app-game',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      DB_PATH: '/data/game.db',
      AWS_REGION: 'eu-west-2',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/game/err.log',
    out_file: '/var/log/game/out.log',
    max_memory_restart: '400M',
  }]
}
