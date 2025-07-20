#!/bin/bash

echo "Testing Napoleon UI flickering behavior..."
echo ""
echo "1. Testing WITHOUT debug mode (should show flickering)"
echo "   Press 'n' to open spawn dialog and observe if UI flickers"
echo "   Press 'q' to quit and continue to next test"
echo ""
echo "Press Enter to start..."
read

npm run dev

echo ""
echo "2. Testing WITH debug mode (flickering should be gone)"
echo "   Press 'n' to open spawn dialog and observe no flickering"
echo "   Press 'q' to quit"
echo ""
echo "Press Enter to start..."
read

NAPOLEON_DEBUG_RENDERS=true npm run dev

echo ""
echo "Test complete!"