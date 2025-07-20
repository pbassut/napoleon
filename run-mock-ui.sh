#!/bin/bash

echo "Starting Napoleon Mock UI..."
echo ""
echo "This runs the Ink UI with a mock agent manager for testing."
echo ""

# Run the mock UI directly
NAPOLEON_DEBUG_RENDERS=true node src/ui/ink/index.tsx