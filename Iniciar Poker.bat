@echo off
title Poker Bankroll
cd /d "%~dp0"

rem Gera a versao otimizada na primeira vez (ou apos mudancas no codigo)
if not exist ".next\BUILD_ID" (
  echo Preparando o aplicativo pela primeira vez...
  call npm run build
)

echo.
echo  Poker Bankroll rodando em:  http://localhost:3000
echo  (feche esta janela para parar o aplicativo)
echo.
call npm start
pause
