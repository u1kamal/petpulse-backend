import sys

def check_header(filepath):
    try:
        with open(filepath, 'rb') as f:
            header = f.read(3)
            print(f"{filepath}: {header}")
            if header == b'\xff\xd8\xff':
                print(f"  -> DETECTED: JPEG (masked as PNG)")
            elif header.startswith(b'\x89PN'):
                print(f"  -> DETECTED: PNG (valid)")
            else:
                print(f"  -> UNKNOWN format")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

check_header('mobile/assets/icon.png')
check_header('mobile/assets/adaptive-icon.png')
