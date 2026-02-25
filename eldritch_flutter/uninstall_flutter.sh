#!/bin/bash
# Remove all existing Flutter installs and the pub cache for a clean reinstall.
# Run in Terminal, then install with: brew install --cask flutter

set -e
echo "Uninstalling Flutter completely..."
echo ""

echo "1. Uninstalling Homebrew Flutter cask..."
if brew list --cask flutter &>/dev/null; then
  brew uninstall --cask flutter
  echo "   Done."
else
  echo "   Flutter cask not installed, skipping."
fi

echo ""
echo "2. Removing /usr/local/share/flutter (if present)..."
if [ -d /usr/local/share/flutter ]; then
  sudo rm -rf /usr/local/share/flutter
  echo "   Removed."
else
  echo "   Not found, skipping."
fi

echo ""
echo "3. Removing pub cache for clean reinstall (no root-owned packages)..."
if [ -d "$HOME/.pub-cache" ]; then
  rm -rf "$HOME/.pub-cache"
  echo "   Removed ~/.pub-cache"
else
  echo "   Not found, skipping."
fi

echo ""
echo "Done. Install Flutter with:"
echo "  brew install --cask flutter"
echo "Then: flutter doctor -v"
