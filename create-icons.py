#!/usr/bin/env python3
"""
Generate PNG icons for the CIM Training App
Requires: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create image with blue background
    img = Image.new('RGB', (size, size), color='#4A90E2')
    draw = ImageDraw.Draw(img)

    # Try to use a system font, fall back to default if not available
    try:
        # macOS system fonts
        font_large = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', int(size * 0.375))
        font_small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', int(size * 0.125))
    except:
        # Use default font if system font not found
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw "CIM" text
    text1 = "CIM"
    bbox1 = draw.textbbox((0, 0), text1, font=font_large)
    text1_width = bbox1[2] - bbox1[0]
    text1_height = bbox1[3] - bbox1[1]
    x1 = (size - text1_width) / 2
    y1 = size * 0.45 - text1_height / 2
    draw.text((x1, y1), text1, fill='white', font=font_large)

    # Draw "Training" text
    text2 = "Training"
    bbox2 = draw.textbbox((0, 0), text2, font=font_small)
    text2_width = bbox2[2] - bbox2[0]
    text2_height = bbox2[3] - bbox2[1]
    x2 = (size - text2_width) / 2
    y2 = size * 0.7 - text2_height / 2
    draw.text((x2, y2), text2, fill='white', font=font_small)

    # Save image
    img.save(filename, 'PNG')
    print(f'✓ Created {filename}')

if __name__ == '__main__':
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)

    try:
        create_icon(192, 'icons/icon-192.png')
        create_icon(512, 'icons/icon-512.png')
        print('\nIcons created successfully!')
    except Exception as e:
        print(f'Error: {e}')
        print('\nTo use this script:')
        print('1. Install Pillow: pip3 install pillow')
        print('2. Run: python3 create-icons.py')
        print('\nOr use the generate-icons.html file in a browser instead.')
