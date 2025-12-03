from PIL import Image
import os

def convert_to_png(filepath):
    try:
        print(f"Processing {filepath}...")
        # Open the image (PIL detects format automatically)
        with Image.open(filepath) as img:
            print(f"  - Original format: {img.format}")
            
            # Force convert to RGBA (standard for PNG icons)
            rgba_img = img.convert('RGBA')
            
            # Save as PNG, overwriting the original
            rgba_img.save(filepath, 'PNG')
            print(f"  - Saved as valid PNG")
            
    except Exception as e:
        print(f"Error converting {filepath}: {e}")

# Convert the problematic files
convert_to_png('mobile/assets/icon.png')
convert_to_png('mobile/assets/adaptive-icon.png')
