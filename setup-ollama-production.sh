#!/bin/bash
# Quick setup script for Ollama on production VM

set -e

echo "=== Setting up Ollama on Production VM ==="
echo ""

# Install Ollama
echo "Step 1: Installing Ollama..."
if command -v ollama &> /dev/null; then
    echo "✓ Ollama already installed"
else
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✓ Ollama installed successfully"
fi
echo ""

# Pull the required model
echo "Step 2: Pulling llama3.1:8b model (this may take a while)..."
ollama pull llama3.1:8b
echo "✓ Model downloaded"
echo ""

# Start Ollama service
echo "Step 3: Starting Ollama service..."
# Kill any existing Ollama process
pkill ollama || true
sleep 2

# Start Ollama in background
nohup ollama serve > /tmp/ollama.log 2>&1 &
sleep 5

# Verify it's running
if curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "✓ Ollama is running and responding"
    curl -s http://localhost:11434/api/version
else
    echo "✗ Ollama failed to start"
    echo "Check logs: tail /tmp/ollama.log"
    exit 1
fi
echo ""

# Test with a simple prompt
echo "Step 4: Testing Ollama with a sample prompt..."
curl -s http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Extract key terms from: AI-powered smartphone camera",
  "stream": false
}' | head -c 200
echo ""
echo ""

# Setup systemd service (optional, for persistence)
echo "Step 5: Setting up Ollama as a systemd service (for auto-start)..."
sudo bash -c 'cat > /etc/systemd/system/ollama.service << EOF
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama --no-pager
echo ""

echo "=== Ollama Setup Complete! ==="
echo ""
echo "Ollama is now:"
echo "  - Running on http://localhost:11434"
echo "  - Will auto-start on system reboot"
echo "  - Using model: llama3.1:8b"
echo ""
echo "Check status: sudo systemctl status ollama"
echo "View logs: journalctl -u ollama -f"
echo "Test API: curl http://localhost:11434/api/version"
echo ""
echo "Now restart your Next.js app to use Ollama!"
