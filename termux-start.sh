#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# PocketHub & Trilium - Android Termux Dual-Service Supervisor
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================"
echo "  🚀 Starting PocketHub & Services on Android Termux"
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
    echo "so your media and notes can be saved to your phone's main storage."
    echo "Continuing with internal storage for now..."
else
    echo "✅ Android shared storage access verified."
fi

# 3. Check node_modules
if [ ! -d "$DIR/node_modules" ]; then
    echo "📦 Installing project dependencies..."
    npm install --omit=dev
fi

# Track Child PIDs for Graceful Shutdown
TRILIUM_PID=""
POCKETHUB_PID=""

cleanup() {
    echo ""
    echo "🛑 Stopping services gracefully..."
    trap - SIGINT SIGTERM EXIT
    if [ -n "$TRILIUM_PID" ]; then
        kill "$TRILIUM_PID" 2>/dev/null || true
    fi
    if [ -n "$POCKETHUB_PID" ]; then
        kill "$POCKETHUB_PID" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "👋 All services stopped cleanly."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 4. Check & Launch Trilium Notes Server (Port 8080)
if [ -f "$DIR/run-trilium.sh" ]; then
    echo "📚 Starting Trilium Notes Server on port 8080..."
    "$DIR/run-trilium.sh" > /dev/null 2>&1 &
    TRILIUM_PID=$!
    echo "✅ Trilium Notes running (PID: $TRILIUM_PID)"
else
    echo "💡 Note: Trilium is not installed yet."
    echo "   To enable full hierarchical notes on port 8080, run: ./setup-trilium.sh"
fi

# 5. Display Connection Info
echo "------------------------------------------------------"
echo "🔍 Network Access Addresses (Hotspot/Wi-Fi):"
if command -v ip >/dev/null 2>&1; then
    ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | while read -r ip; do
        echo "   👉 PocketHub (Media & Quick Notes): http://$ip:3000"
        if [ -n "$TRILIUM_PID" ]; then
            echo "   👉 Trilium Notes (Port 8080):       http://$ip:8080"
        fi
    done
fi
echo "------------------------------------------------------"

# 6. Launch PocketHub (Port 3000)
node src/server.js &
POCKETHUB_PID=$!

# Wait for supervisor termination
wait "$POCKETHUB_PID"
