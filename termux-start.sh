#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# PocketHub - Android Termux Startup Script
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================"
echo "  🚀 Starting PocketHub on Android Termux"
echo "======================================================"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed!"
    echo "Please run: pkg install nodejs"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js detected: $NODE_VERSION"

# 2. Check Android Storage Access
if [ ! -d "$HOME/storage/shared" ]; then
    echo "⚠️  Android storage permission not detected in Termux."
    echo "Please run 'termux-setup-storage' and grant storage permission,"
    echo "so your media files can be saved to your phone's main storage."
    echo "Continuing with internal storage for now..."
else
    echo "✅ Android shared storage access verified."
fi

# 3. Check node_modules
if [ ! -d "$DIR/node_modules" ]; then
    echo "📦 Installing project dependencies..."
    npm install --omit=dev
fi

# 4. Display IP Info
echo "------------------------------------------------------"
echo "🔍 Checking network addresses (Hotspot/Wi-Fi):"
if command -v ip >/dev/null 2>&1; then
    ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | while read -r ip; do
        echo "   👉 http://$ip:3000"
    done
fi
echo "------------------------------------------------------"

# 5. Launch PocketHub
exec node src/server.js
