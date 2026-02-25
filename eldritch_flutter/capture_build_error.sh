#!/bin/bash
# Run this when "flutter run --debug" fails. It captures the full error so we can fix it.
# Usage: ./capture_build_error.sh

cd "$(dirname "$0")"
LOG="$HOME/eldritch_build_log.txt"

echo "Building and saving full output to $LOG ..."
if flutter build apk --debug 2>&1 | tee "$LOG"; then
  echo ""
  echo "Build succeeded. Try: flutter run --debug"
  exit 0
fi

echo ""
echo "Build failed. Exit code: $?"
echo "Full log: $LOG"
echo ""
echo "=== Last 80 lines (look for 'Error:' or 'What went wrong') ==="
tail -80 "$LOG"
