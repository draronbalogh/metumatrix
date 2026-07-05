// PM2 process-leírás a metumatrix/web apphoz (always-on, telefonról bármikor elérhető).
// Indítás:  cd C:\node\metumatrix\web  &&  pm2 start ecosystem.config.cjs  &&  pm2 save
// Autostart gépindításkor:  pm2 startup  (a kiírt parancsot lefuttatni), majd  pm2 save
//
// Fejlesztés alatt a 'next dev' marad (hot-reload + túléli az újraindítást). Stabil állapotban
// válts productionre: előbb  npm run build , majd az args-ot 'start -p 3939'-re.
module.exports = {
  apps: [
    {
      name: 'metumatrix-web',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 3939',
      autorestart: true,
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'metumatrix-reminders',
      cwd: __dirname,
      script: 'scripts/reminder-cron.mjs',
      autorestart: true,
      env: { APP_URL: 'http://localhost:3939' },
    },
  ],
};
