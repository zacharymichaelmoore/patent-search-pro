#!/bin/bash
# Diagnostic script to check if services are running on the VM

echo "=== Patent Search VM Service Check ==="
echo ""

# Check if Ollama is installed
echo "1. Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is installed"
    ollama --version
else
    echo "✗ Ollama is NOT installed"
fi
echo ""

# Check if Ollama service is running
echo "2. Checking if Ollama is running..."
if pgrep -x "ollama" > /dev/null; then
    echo "✓ Ollama process is running"
    ps aux | grep ollama | grep -v grep
else
    echo "✗ Ollama is NOT running"
fi
echo ""

# Check if Ollama is responding
echo "3. Testing Ollama API..."
if curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "✓ Ollama API is responding"
    curl -s http://localhost:11434/api/version
else
    echo "✗ Ollama API is NOT responding on port 11434"
fi
echo ""

# Check which models are available
echo "4. Checking available Ollama models..."
if command -v ollama &> /dev/null; then
    ollama list
else
    echo "Skipping - Ollama not installed"
fi
echo ""

# Check if Node.js is installed
echo "5. Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✓ Node.js is installed"
    node --version
else
    echo "✗ Node.js is NOT installed"
fi
echo ""

# Check if the Next.js app is running
echo "6. Checking Next.js application..."
if pgrep -f "next" > /dev/null; then
    echo "✓ Next.js process is running"
    ps aux | grep next | grep -v grep
else
    echo "✗ Next.js is NOT running"
fi
echo ""

# Check listening ports
echo "7. Checking open ports..."
echo "Port 3000 (Next.js):"
if netstat -tlnp 2>/dev/null | grep :3000 > /dev/null; then
    echo "✓ Port 3000 is listening"
    netstat -tlnp 2>/dev/null | grep :3000
else
    echo "✗ Port 3000 is NOT listening"
fi
echo ""

echo "Port 11434 (Ollama):"
if netstat -tlnp 2>/dev/null | grep :11434 > /dev/null; then
    echo "✓ Port 11434 is listening"
    netstat -tlnp 2>/dev/null | grep :11434
else
    echo "✗ Port 11434 is NOT listening"
fi
echo ""

# Check environment variables
echo "8. Checking environment variables..."
if [ -f ~/.bashrc ]; then
    echo "Checking .bashrc for OLLAMA_URL..."
    grep OLLAMA_URL ~/.bashrc || echo "OLLAMA_URL not set in .bashrc"
fi
echo ""

# Check system resources
echo "9. System Resources:"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h | grep -E "Filesystem|/$"
echo ""

# Check logs
echo "10. Recent system logs (last 20 lines):"
if [ -f /var/log/syslog ]; then
    tail -n 20 /var/log/syslog | grep -i "ollama\|error" || echo "No recent Ollama errors in syslog"
fi
echo ""

echo "=== Service Check Complete ==="
echo ""
echo "Next steps:"
echo "1. If Ollama is not installed, run: curl -fsSL https://ollama.com/install.sh | sh"
echo "2. If Ollama is installed but not running, run: ollama serve"
echo "3. If llama3.1:8b model is missing, run: ollama pull llama3.1:8b"
echo "4. Set OLLAMA_URL in .env.local: OLLAMA_URL=http://localhost:11434"
