#!/bin/bash

echo "🚀 Inicializando Backend ADMRufu Panel"
echo "======================================"

# 1. Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install

# 2. Crear directorio de logs
echo ""
echo "📁 Creando directorio de logs..."
mkdir -p logs

# 3. Copiar .env si no existe
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Creando archivo .env..."
    cp .env.example .env
    echo "✅ Archivo .env creado. EDÍTALO antes de continuar."
else
    echo ""
    echo "✅ Archivo .env ya existe"
fi

# 4. Generar cliente Prisma
echo ""
echo "🔧 Generando cliente Prisma..."
npx prisma generate

# 5. Ejecutar migraciones
echo ""
echo "📊 Ejecutando migraciones de base de datos..."
npx prisma migrate dev --name init

# 6. Ejecutar seed
echo ""
echo "🌱 Ejecutando seed (crear admin inicial)..."
npx tsx prisma/seed.ts

echo ""
echo "======================================"
echo "✅ Backend inicializado correctamente"
echo "======================================"
echo ""
echo "Para iniciar el servidor:"
echo "  npm run dev"
echo ""
