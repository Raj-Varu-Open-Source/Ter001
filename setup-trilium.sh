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
# Only skip if trilium.sh and src directory are genuinely present and verified
if [ ! -f "$TRILIUM_DIR/trilium.sh" ] || [ ! -d "$TRILIUM_DIR/src" ]; then
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
    
    # Locate the folder that contains trilium.sh (the main server root)
    FOUND_DIR=$(find /tmp/trilium_extracted -name "trilium.sh" -exec dirname {} \; | head -n 1)
    if [ -z "$FOUND_DIR" ]; then
        FOUND_DIR=$(find /tmp/trilium_extracted -type d -name "*trilium*" | head -n 1)
    fi
    if [ -z "$FOUND_DIR" ]; then
        FOUND_DIR="/tmp/trilium_extracted"
    fi
    
    echo "📂 Installing Trilium files from $FOUND_DIR to $TRILIUM_DIR..."
    rm -rf "$TRILIUM_DIR"
    mkdir -p "$TRILIUM_DIR"
    cp -r "$FOUND_DIR"/* "$TRILIUM_DIR"/
    rm -rf /tmp/trilium_extracted /tmp/trilium.tar.xz
    chmod +x "$TRILIUM_DIR"/trilium.sh 2>/dev/null || true
    if [ -d "$TRILIUM_DIR/node/bin" ]; then
        chmod +x "$TRILIUM_DIR"/node/bin/* 2>/dev/null || true
    fi
    echo "✅ Trilium installed successfully in $TRILIUM_DIR."
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

if [ -f "./trilium.sh" ]; then
    chmod +x ./trilium.sh 2>/dev/null
    exec ./trilium.sh
elif [ -f "./src/www" ]; then
    if [ -x "./node/bin/node" ]; then
        exec ./node/bin/node src/www
    else
        exec node src/www
    fi
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
