#!/bin/bash

LOG_DIR="$HOME/.napoleon/logs"
LOG_FILE="$LOG_DIR/combined.log"

echo "Monitoring Napoleon logs..."
echo "Watching: $LOG_FILE"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Show last 50 lines then follow new entries
echo "=== Recent logs ==="
tail -50 "$LOG_FILE" | grep -E "(SpawnDialog|App:|MockAgentManager|useAgentManager)" --color=always || echo "No recent spawn-related logs"
echo ""
echo "=== Following new logs ==="
tail -f "$LOG_FILE" | grep -E "(SpawnDialog|App:|MockAgentManager|useAgentManager)" --color=always