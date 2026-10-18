#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# PocketHub - Automated TriliumNext Server Installer for Android Termux
# ==============================================================================
# This script installs TriliumNext Server inside PRoot Debian on Android Termux.
# Using PRoot ensures 100% native SQLite (better-sqlite3) and glibc compatibility
# without needing to recompile complex C++ libraries or Python tools on Android.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "======================================================"
echo "  📚 Installing Trilium Notes Server for Termux"
echo "======================================================"

# 1. Ensure required Termux tools
echo "📦 Step 1: Checking Termux packages..."
pkg update -y
pkg install -y proot-distro wget tar xz-utils curl jq

# 2. Check Android Shared Storage for persistent notes backup
TRILIUM_STORAGE_DIR="$HOME/storage/shared/PocketHub/trilium-data"
if [ ! -d "$HOME/storage/shared" ]; then
    echo "⚠️  Android storage permission not detected. Notes will be stored in Termux internal storage."
    TRILIUM_STORAGE_DIR="$DIR/trilium-data"
fi
mkdir -p "$TRILIUM_STORAGE_DIR"
echo "✅ Persistent Trilium data directory: $TRILIUM_STORAGE_DIR"

# 3. Setup Debian in proot-distro
DISTRO="debian"
echo "🐧 Step 2: Preparing Debian Linux environment via proot-distro..."
if ! proot-distro list | grep -q "$DISTRO (installed)"; then
    echo "⬇️  Downloading Debian rootfs (this takes a couple of minutes)..."
    proot-distro install "$DISTRO"
else
    echo "✅ Debian environment already installed in proot-distro."
fi

# 4. Provision Trilium inside Debian
echo "🚀 Step 3: Installing Node.js & Trilium Server in Debian..."
proot-distro login "$DISTRO" -- bash -c '
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget tar xz-utils ca-certificates libatomic1 nodejs

# Ensure internal native ext4 data directory exists for SQLite WAL mode safety
mkdir -p /root/trilium-data

TRILIUM_DIR="/root/trilium"
# Only skip if Trilium is genuinely present and verified
if [ ! -f "$TRILIUM_DIR/package.json" ] && [ ! -f "$TRILIUM_DIR/src/www" ] && [ ! -f "$TRILIUM_DIR/src/www.js" ]; then
    echo "🔍 Fetching latest Trilium server release for linux-arm64..."
    LATEST_TAG=$(curl -s https://api.github.com/repos/TriliumNext/Trilium/releases/latest | grep "tag_name" | cut -d "\"" -f 4 || echo "v0.106.0")
    if [ -z "$LATEST_TAG" ]; then LATEST_TAG="v0.106.0"; fi
    echo "⬇️ Downloading Trilium release: $LATEST_TAG (linux-arm64)..."
    
    DOWNLOAD_URL="https://github.com/TriliumNext/Trilium/releases/download/${LATEST_TAG}/TriliumNotes-Server-${LATEST_TAG}-linux-arm64.tar.xz"
    
    rm -rf /tmp/trilium_extracted /tmp/trilium.tar.xz
    mkdir -p /tmp/trilium_extracted
    
    if ! wget -q --show-progress -O /tmp/trilium.tar.xz "$DOWNLOAD_URL"; then
        echo "⚠️ Attempting fallback to v0.106.0..."
        wget -q --show-progress -O /tmp/trilium.tar.xz "https://github.com/TriliumNext/Trilium/releases/download/v0.106.0/TriliumNotes-Server-v0.106.0-linux-arm64.tar.xz"
    fi
    
    echo "📦 Extracting Trilium package..."
    tar -xf /tmp/trilium.tar.xz -C /tmp/trilium_extracted
    
    # Dynamically find the root containing package.json or src/www
    FOUND_DIR=$(find /tmp/trilium_extracted -name "package.json" -exec dirname {} \; | head -n 1)
    if [ -z "$FOUND_DIR" ]; then
        FOUND_DIR=$(find /tmp/trilium_extracted -name "trilium.sh" -exec dirname {} \; | head -n 1)
    fi
    if [ -z "$FOUND_DIR" ]; then
        FOUND_DIR="/tmp/trilium_extracted"
    fi
    
    echo "📂 Moving Trilium files from $FOUND_DIR to $TRILIUM_DIR..."
    rm -rf "$TRILIUM_DIR"
    mkdir -p "$TRILIUM_DIR"
    cp -r "$FOUND_DIR"/* "$TRILIUM_DIR"/
    rm -rf /tmp/trilium_extracted /tmp/trilium.tar.xz
    chmod +x "$TRILIUM_DIR"/trilium.sh 2>/dev/null || true
    echo "✅ Trilium extracted successfully."
else
    echo "✅ Trilium is already installed in /root/trilium."
fi
'

# 5. Create launcher script
echo "📝 Step 4: Generating run-trilium.sh launcher..."
cat << 'EOF' > "$DIR/run-trilium.sh"
#!/data/data/com.termux/files/usr/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[Trilium] Starting Trilium Server on 0.0.0.0:8080..."
echo "[Trilium] Data directory: /root/trilium-data (PRoot native ext4 storage)"

exec proot-distro login debian -- bash -c '
export TRILIUM_DATA_DIR="/root/trilium-data"
export TRILIUM_NETWORK_PORT=8080
export TRILIUM_NETWORK_HOST=0.0.0.0

cd /root/trilium

# Detect entry point
if [ -f "./src/www" ]; then
    ENTRY="src/www"
elif [ -f "./src/www.js" ]; then
    ENTRY="src/www.js"
elif [ -f "./www" ]; then
    ENTRY="www"
elif [ -f "./www.js" ]; then
    ENTRY="www.js"
else
    ENTRY=$(find . -name "www" -o -name "www.js" | head -n 1)
fi

# Detect node binary
if [ -x "./node/bin/node" ]; then
    NODE_BIN="./node/bin/node"
else
    NODE_BIN="node"
fi

if [ -n "$ENTRY" ]; then
    echo "[Trilium] Starting $NODE_BIN $ENTRY..."
    exec "$NODE_BIN" "$ENTRY"
elif [ -x "./trilium.sh" ]; then
    echo "[Trilium] Starting via ./trilium.sh..."
    exec ./trilium.sh
else
    echo "❌ Error: Could not locate Trilium entry point in /root/trilium"
    ls -la /root/trilium
    exit 1
fi
'
EOF

chmod +x "$DIR/run-trilium.sh"

echo "======================================================"
echo "  🎉 Trilium Server setup is complete!"
echo "======================================================"
echo "You can now start both PocketHub and Trilium with:"
echo "   ./termux-start.sh"
echo ""
echo "Or start Trilium individually anytime with:"
echo "   ./run-trilium.sh"
echo "======================================================"
