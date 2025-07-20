#!/bin/bash

echo "Starting Napoleon Test UI..."
echo ""
echo "This runs the Ink UI with the real agent manager for testing."
echo ""

# Run the test UI directly
NAPOLEON_DEBUG_RENDERS=true node src/ui/ink/index.tsx