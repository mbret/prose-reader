#!/bin/bash

# Script to sync ../packages/ folder into node_modules/@prose-reader/
# This is useful for local development when working with linked packages

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Source and destination paths
PACKAGES_DIR="$APP_DIR/../packages"
NODE_MODULES_DIR="$APP_DIR/node_modules/@prose-reader"

echo "Syncing packages from $PACKAGES_DIR to $NODE_MODULES_DIR"

# Create the destination directory if it doesn't exist
mkdir -p "$NODE_MODULES_DIR"

# Sync the packages using rsync
# --archive: preserve permissions, timestamps, etc.
# --verbose: show what's being copied
# --delete: delete files in destination that don't exist in source
# --exclude: exclude common development files that shouldn't be synced
rsync -av --delete \
  --exclude=".git" \
  --exclude=".test" \
  --exclude="src" \
  --exclude="*.log" \
  --exclude=".DS_Store" \
  --exclude=".next" \
  --exclude="coverage" \
  "$PACKAGES_DIR/" "$NODE_MODULES_DIR/"

echo "Sync completed successfully!"
