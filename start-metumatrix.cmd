@echo off
rem A metumatrix web app inditasa; kimenet naplozva. A start-metumatrix.vbs hivja rejtve.
cd /d C:\node\metumatrix\web
echo ===== inditas: %date% %time% ===== >> C:\node\metumatrix\metumatrix-server.log
call npm run dev >> C:\node\metumatrix\metumatrix-server.log 2>&1
