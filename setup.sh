#!/bin/bash
# ACE-Step UI Setup Script

set -e

echo "=================================="
echo "  ACE-Step UI Setup"
echo "=================================="

# ============= ACE-Step Configuration | ACE-Step 配置 =============
# Set ACE-Step installation path (parent directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACESTEP_PATH="${ACESTEP_PATH:-$(dirname "$SCRIPT_DIR")}"
# Set Python executable path (virtual environment)
if [ -f "$ACESTEP_PATH/.venv/bin/python" ]; then
    PYTHON_PATH="$ACESTEP_PATH/.venv/bin/python"
elif [ -f "$ACESTEP_PATH/venv/bin/python" ]; then
    PYTHON_PATH="$ACESTEP_PATH/venv/bin/python"
else
    PYTHON_PATH=""
fi

echo "ACE-Step Path: $ACESTEP_PATH"
echo "Python Path:   ${PYTHON_PATH:-not found}"
echo ""

if [ ! -d "$ACESTEP_PATH" ]; then
    echo "Error: ACE-Step not found at $ACESTEP_PATH"
    exit 1
fi

if [ -z "$PYTHON_PATH" ]; then
    echo "Warning: ACE-Step venv not found. Please set up ACE-Step first:"
    echo "  cd $ACESTEP_PATH"
    echo "  uv venv && uv pip install -e ."
fi

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
# ACE-Step UI Configuration

# Path to ACE-Step installation
ACESTEP_PATH=$ACESTEP_PATH
PYTHON_PATH=${PYTHON_PATH}

# Server ports
PORT=3001
FRONTEND_PORT=3000

# Database
DATABASE_PATH=./server/data/acestep.db
EOF

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
npm install

# Install server dependencies
echo ""
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Initialize database
echo ""
echo "Initializing database..."
cd server
npm run migrate 2>/dev/null || echo "Migration script not found, skipping..."
cd ..

echo ""
echo "=================================="
echo "  Setup Complete!"
echo "=================================="
echo ""
echo "To start the application:"
echo ""
echo "  # Terminal 1 - Start backend"
echo "  cd server && npm run dev"
echo ""
echo "  # Terminal 2 - Start frontend"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
