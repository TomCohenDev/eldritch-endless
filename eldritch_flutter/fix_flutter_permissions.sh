#!/bin/bash
# Fix Flutter project and SDK permissions (some files were created as root)
# Run once in Terminal: ./fix_flutter_permissions.sh

set -e
PROJECT_DIR="/Users/tomcohen/github/eldritch-endless/eldritch_flutter"
FLUTTER_SDK="/usr/local/share/flutter"
USER=$(whoami)

echo "1. Fixing ownership of project: $PROJECT_DIR"
sudo chown -R "$USER:staff" "$PROJECT_DIR"

echo "2. Fixing ownership of Flutter SDK: $FLUTTER_SDK"
sudo chown -R "$USER:staff" "$FLUTTER_SDK"

echo "3. Fixing ownership of pub cache (fixes 'Permission denied' on packages)..."
sudo chown -R "$USER:staff" "$HOME/.pub-cache"

echo "4. Clearing Gradle build/cache inside Flutter SDK (fixes 'Bad file descriptor')..."
RM_DIRS=(
  "$FLUTTER_SDK/packages/flutter_tools/gradle/build"
  "$FLUTTER_SDK/packages/flutter_tools/gradle/.gradle"
  "$FLUTTER_SDK/packages/flutter_tools/gradle/.kotlin"
)
for d in "${RM_DIRS[@]}"; do
  if [ -d "$d" ]; then
    rm -rf "$d"
    echo "   Removed $d"
  fi
done

echo "Done. Run: export TMPDIR=/tmp && flutter run --debug"
