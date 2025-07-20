#!/bin/bash

LOG_DIR="$HOME/.napoleon/logs"
LOG_FILE="$LOG_DIR/combined.log"

echo "Monitoring ALL Napoleon logs..."
echo "Watching: $LOG_FILE"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Show last 20 lines then follow new entries
echo "=== Recent logs ==="
tail -20 "$LOG_FILE" || echo "No recent logs"
echo ""
echo "=== Following new logs ==="
tail -f "$LOG_FILE"