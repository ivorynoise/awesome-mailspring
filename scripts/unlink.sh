#!/usr/bin/env bash
# Remove a plugin symlink from Mailspring's packages directory.
# Usage: scripts/unlink.sh <plugin-name>
set -e

if [[ -z "$1" ]]; then
  echo "Usage: $0 <plugin-name>"
  exit 1
fi

PLUGIN_NAME="$1"

for DIR in \
  "$HOME/.var/app/com.getmailspring.Mailspring/config/Mailspring/packages" \
  "$HOME/.config/Mailspring/packages" \
  "$HOME/Library/Application Support/Mailspring/packages"; do
  LINK="$DIR/$PLUGIN_NAME"
  if [[ -L "$LINK" ]]; then
    rm "$LINK"
    echo "Removed $LINK"
    echo "Restart Mailspring to deactivate the plugin."
    exit 0
  fi
done

echo "No symlink found for '$PLUGIN_NAME'."
exit 1
