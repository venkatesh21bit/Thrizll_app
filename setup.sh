#!/bin/bash

echo "🚀 Starting Digital Body Language MVP"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 To start the React Native app:"
echo "   npx expo start"
echo ""
echo "🖥️  To start the backend server:"
echo "   cd backend && python main.py"
echo ""
echo "🧪 To test the backend with demo data:"
echo "   cd backend && python demo_data.py"
echo ""
echo "🎯 Or use VS Code tasks:"
echo "   - 'Start React Native App'"
echo "   - 'Start Backend Server'"  
echo "   - 'Start Full Stack'"
echo ""
