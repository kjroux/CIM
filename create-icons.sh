#!/bin/bash

# Script to create PNG icons from SVG
# Requires ImageMagick: brew install imagemagick

echo "Creating PNG icons from SVG..."

if ! command -v convert &> /dev/null
then
    echo "ImageMagick is not installed."
    echo "Install it with: brew install imagemagick"
    echo ""
    echo "Or create PNG icons manually and save them as:"
    echo "  - icons/icon-192.png (192x192 pixels)"
    echo "  - icons/icon-512.png (512x512 pixels)"
    exit 1
fi

# Create 192x192 icon
convert -background none -resize 192x192 icons/icon-192.svg icons/icon-192.png
echo "✓ Created icons/icon-192.png"

# Create 512x512 icon
convert -background none -resize 512x512 icons/icon-512.svg icons/icon-512.png
echo "✓ Created icons/icon-512.png"

echo ""
echo "Icons created successfully!"
echo "You can now install the app as a PWA."
