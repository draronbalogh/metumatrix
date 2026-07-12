@echo off
rem A metumatrix web app inditasa; kimenet naplozva. A start-metumatrix.vbs hivja rejtve.
rem -H 127.0.0.1: a szerver CSAK localhost-on figyel — kivulrol egyedul a Tailscale
rem HTTPS-proxy (https://desktop-a6og3gf.tailcd8483.ts.net) eri el, a nyers IP:3939 nem.
cd /d C:\node\metumatrix\web
echo ===== inditas: %date% %time% ===== >> C:\node\metumatrix\metumatrix-server.log
call npm run dev -- -H 127.0.0.1 >> C:\node\metumatrix\metumatrix-server.log 2>&1
