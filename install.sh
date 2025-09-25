#!/bin/bash

# Script d'instal·lació per PalamMaster
# Aquest script instal·la les dependències i compila l'aplicació

echo "==================================="
echo "  PalamMaster - Script d'instal·lació"
echo "==================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no està instal·lat"
    echo "   Instal·la Node.js des de https://nodejs.org/"
    exit 1
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no està disponible"
    exit 1
fi

echo "✅ Node.js versió: $(node --version)"
echo "✅ npm versió: $(npm --version)"
echo ""

# Instal·lar dependències
echo "📦 Instal·lant dependències..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instal·lant dependències"
    exit 1
fi

echo "✅ Dependències instal·lades correctament"
echo ""

# Preguntar si vol compilar l'aplicació
read -p "Vols compilar l'aplicació per distribució? (s/N): " compile

if [[ $compile =~ ^[Ss]$ ]]; then
    echo "🏗️  Compilant aplicació..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Aplicació compilada correctament"
        echo "📁 Els fitxers compilats es troben a la carpeta 'dist/'"
    else
        echo "❌ Error compilant l'aplicació"
    fi
else
    echo "ℹ️  Pots compilar l'aplicació més tard amb: npm run build"
fi

echo ""
echo "🎉 Instal·lació completada!"
echo ""
echo "Per executar l'aplicació:"
echo "  - Mode desenvolupament: npm start"
echo "  - Mode producció: npm run build"
echo ""
echo "Per més informació, consulta el fitxer README.md"