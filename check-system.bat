@echo off
echo ========================================
echo   Diagnostico del Sistema ADMRufu
echo ========================================
echo.

echo [1/5] Verificando Backend (Puerto 3001)...
netstat -ano | findstr :3001
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend esta corriendo en puerto 3001
) else (
    echo [ERROR] Backend NO esta corriendo
    echo        Ejecuta: cd backend ^& npm run dev
)
echo.

echo [2/5] Verificando PostgreSQL...
tasklist | findstr postgres
if %ERRORLEVEL% EQU 0 (
    echo [OK] PostgreSQL esta corriendo
) else (
    echo [ERROR] PostgreSQL NO esta corriendo
    echo        Inicia el servicio de PostgreSQL
)
echo.

echo [3/5] Probando Health Check...
curl -s http://localhost:3001/health
echo.
if %ERRORLEVEL% EQU 0 (
    echo [OK] API responde correctamente
) else (
    echo [ERROR] API no responde
)
echo.

echo [4/5] Verificando archivos de configuracion...
if exist "backend\.env" (
    echo [OK] backend\.env existe
) else (
    echo [ERROR] backend\.env NO existe
    echo        Copia .env.example a .env
)

if exist "frontend\.env" (
    echo [OK] frontend\.env existe
) else (
    echo [WARN] frontend\.env NO existe (opcional)
)
echo.

echo [5/5] Verificando Node Modules...
if exist "backend\node_modules" (
    echo [OK] backend\node_modules existe
) else (
    echo [ERROR] backend\node_modules NO existe
    echo        Ejecuta: cd backend ^& npm install
)

if exist "frontend\node_modules" (
    echo [OK] frontend\node_modules existe
) else (
    echo [ERROR] frontend\node_modules NO existe
    echo        Ejecuta: cd frontend ^& npm install
)
echo.

echo ========================================
echo   Diagnostico Completado
echo ========================================
echo.
echo Presiona cualquier tecla para continuar...
pause >nul
