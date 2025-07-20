#!/bin/bash

# Script to run Napoleon with interactive UI
echo "🚀 Starting Napoleon Interactive UI..."
echo ""
echo "This will open Napoleon in your terminal with the Ink UI."
echo "Press 'q' to quit, 'n' to spawn a new agent."
echo ""

# Run napoleon with forced interactive mode
NAPOLEON_FORCE_INK=true npm start