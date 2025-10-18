#!/usr/bin/env python3
"""
Build script for Enhanced LLM Data Extraction App
Creates standalone executable files for distribution
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*50}")
    print(f"🔧 {description}")
    print(f"{'='*50}")
    print(f"Running: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print("✅ Success!")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stdout:
            print(f"stdout: {e.stdout}")
        if e.stderr:
            print(f"stderr: {e.stderr}")
        return False

def create_spec_file():
    """Create PyInstaller spec file for better control"""
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['enhanced_llm_extraction_app.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['pandas', 'openai', 'requests', 'tkinter', 'tkinter.ttk'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='LLM_Data_Extractor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
'''
    
    with open('llm_extractor.spec', 'w') as f:
        f.write(spec_content)
    print("✅ Created PyInstaller spec file")

def clean_build_dirs():
    """Clean previous build directories"""
    dirs_to_clean = ['build', 'dist', '__pycache__']
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"🗑️  Cleaned {dir_name} directory")

def main():
    """Main build process"""
    print("🚀 Enhanced LLM Data Extraction App Builder")
    print("=" * 60)
    
    # Check if main app file exists
    if not os.path.exists('enhanced_llm_extraction_app.py'):
        print("❌ Error: enhanced_llm_extraction_app.py not found!")
        print("Make sure you're in the correct directory.")
        sys.exit(1)
    
    # Clean previous builds
    print("\n🧹 Cleaning previous builds...")
    clean_build_dirs()
    
    # Check if virtual environment is recommended
    print("\n💡 Build Information:")
    print("- This script will create a standalone executable")
    print("- The app will work on systems without Python installed")
    print("- Building in a virtual environment is recommended")
    print("- The executable will be created in the 'dist' folder")
    
    # Check PyInstaller installation
    try:
        import PyInstaller
        print(f"✅ PyInstaller version: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller not found. Installing...")
        if not run_command("pip install pyinstaller", "Installing PyInstaller"):
            print("Failed to install PyInstaller. Please install manually:")
            print("pip install pyinstaller")
            sys.exit(1)
    
    # Create spec file for better control
    print("\n📝 Creating PyInstaller specification...")
    create_spec_file()
    
    # Build the application
    build_commands = [
        {
            "cmd": "pyinstaller --onefile --windowed --name=LLM_Data_Extractor enhanced_llm_extraction_app.py",
            "desc": "Building standalone executable (simple method)"
        },
        # Alternative build using spec file
        # {
        #     "cmd": "pyinstaller llm_extractor.spec",
        #     "desc": "Building using spec file (advanced method)"
        # }
    ]
    
    success = False
    for build_config in build_commands:
        if run_command(build_config["cmd"], build_config["desc"]):
            success = True
            break
    
    if not success:
        print("\n❌ Build failed! Please check the errors above.")
        print("\nTroubleshooting tips:")
        print("1. Make sure all dependencies are installed: pip install -r requirements.txt")
        print("2. Try building in a virtual environment")
        print("3. Check if antivirus is interfering with the build process")
        sys.exit(1)
    
    # Check if build was successful
    exe_path = None
    possible_paths = [
        "dist/LLM_Data_Extractor.exe",  # Windows
        "dist/LLM_Data_Extractor",      # macOS/Linux
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            exe_path = path
            break
    
    if exe_path:
        file_size = os.path.getsize(exe_path) / (1024 * 1024)  # Convert to MB
        print(f"\n🎉 Build successful!")
        print(f"📁 Executable created: {exe_path}")
        print(f"📊 File size: {file_size:.1f} MB")
        print(f"\n📋 Distribution files:")
        
        # List all files in dist directory
        if os.path.exists('dist'):
            for item in os.listdir('dist'):
                item_path = os.path.join('dist', item)
                if os.path.isfile(item_path):
                    size = os.path.getsize(item_path) / (1024 * 1024)
                    print(f"  - {item} ({size:.1f} MB)")
        
        print(f"\n🚀 Ready to distribute!")
        print(f"   You can now share the executable file with others.")
        print(f"   No Python installation required on target machines.")
        
    else:
        print("\n⚠️ Build completed but executable not found in expected location.")
        print("Check the 'dist' directory for build outputs.")

    # Clean up spec file
    if os.path.exists('llm_extractor.spec'):
        os.remove('llm_extractor.spec')

if __name__ == "__main__":
    main() 