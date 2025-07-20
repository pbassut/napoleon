#!/bin/bash

echo "Testing Napoleon agent spawn functionality..."
echo ""
echo "Instructions:"
echo "1. Press 'n' to open the spawn dialog"
echo "2. Type: 'Test agent creation'"
echo "3. Press Enter to spawn"
echo "4. Check console logs below for debugging output"
echo "5. Verify agent appears in the list"
echo ""
echo "Starting with debug mode enabled..."
echo ""

NAPOLEON_DEBUG_RENDERS=true npm run dev