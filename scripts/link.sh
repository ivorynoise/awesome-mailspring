#!/usr/bin/env bash
# Symlink a plugin from this repo into Mailspring's packages directory.
# Usage: scripts/link.sh <plugin-name>
set -e

if [[ -z "$1" ]]; then
  echo "Usage: $0 <plugin-name>"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_NAME="$1"
PLUGIN_DIR="$REPO_DIR/plugins/$PLUGIN_NAME"

if [[ ! -d "$PLUGIN_DIR" ]]; then
  echo "No such plugin: $PLUGIN_DIR"
  exit 1
fi

if [[ ! -e "$PLUGIN_DIR/lib/main.js" ]]; then
  echo "Warning: $PLUGIN_NAME has no compiled lib/main.js — run 'npm run build' first."
fi

# Detect Mailspring packages directory
if [[ -d "$HOME/.var/app/com.getmailspring.Mailspring/config/Mailspring" ]]; then
  TARGET="$HOME/.var/app/com.getmailspring.Mailspring/config/Mailspring/packages"
  # Flatpak needs filesystem access to follow the symlink
  flatpak override --user --filesystem="$PLUGIN_DIR:ro" com.getmailspring.Mailspring
  echo "Granted Flatpak read-only access to $PLUGIN_DIR"
elif [[ -d "$HOME/.config/Mailspring" ]]; then
  TARGET="$HOME/.config/Mailspring/packages"
elif [[ -d "$HOME/Library/Application Support/Mailspring" ]]; then
  TARGET="$HOME/Library/Application Support/Mailspring/packages"
else
  echo "Could not find Mailspring config directory."
  exit 1
fi

mkdir -p "$TARGET"
ln -sfn "$PLUGIN_DIR" "$TARGET/$PLUGIN_NAME"
echo "Linked $PLUGIN_DIR -> $TARGET/$PLUGIN_NAME"
echo "Restart Mailspring to activate the plugin."
