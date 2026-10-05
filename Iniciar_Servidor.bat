@echo off
echo Iniciando servidor local para o Geoportal...
start http://localhost:8001
python -m http.server 8001
pause
