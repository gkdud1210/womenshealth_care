#!/usr/bin/env bash
# Creates a virtual environment and installs dependencies for the iris processor.
set -euo pipefail

VENV_DIR="$(dirname "$0")/.venv"

echo "Creating virtual environment at $VENV_DIR ..."
python3 -m venv "$VENV_DIR"

echo "Activating environment and installing packages ..."
"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install -r "$(dirname "$0")/requirements.txt"

echo ""
echo "Setup complete.  To activate:"
echo "  source $VENV_DIR/bin/activate"
echo ""
echo "Usage:"
echo "  python main.py <path/to/iris.jpg>"
echo "  python main.py <path/to/iris.jpg> --output ./results --verbose"
