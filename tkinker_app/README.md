# EcoData Extractor App

A powerful application for extracting and analyzing data from various sources using multiple LLM providers.

## Features

- Support for multiple LLM providers (OpenAI, Google Gemini, etc.)
- PDF document processing
- Data extraction and analysis
- User-friendly GUI interface
- Cross-platform support

## Installation

### macOS Users

1. Download the latest release from the [Releases page](https://github.com/yourusername/EcoDataExtractorApp/releases)
2. Download the `LLM_Data_Extractor.app` file
3. Move it to your Applications folder
4. Double-click to run
5. **Note:** The app may take a few moments to open initially due to macOS security checks and library loading.

#### Building the app yourself (macOS)
1. Install Python 3.9 or later
2. Clone this repository
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install pyinstaller
   ```
4. Build the app bundle:
   ```bash
   python -m PyInstaller --windowed --name=LLM_Data_Extractor enhanced_llm_extraction_app.py
   ```
5. The `.app` bundle will be in the `dist` directory.

### Windows Users

You have three options:

#### Option 1: Using Pre-built Executable (Recommended)
1. Download the latest release from the [Releases page](https://github.com/yourusername/EcoDataExtractorApp/releases)
2. Download the `LLM_Data_Extractor.exe` file
3. Double-click to run the application

#### Option 2: Run from Source
1. Install Python 3.9 or later
2. Clone this repository
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the application:
   ```bash
   python enhanced_llm_extraction_app.py
   ```

#### Option 3: Build Executable Yourself
1. Install Python 3.9 or later
2. Clone this repository
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install pyinstaller
   ```
4. Build the executable:
   ```bash
   python -m PyInstaller --onefile --windowed --name=LLM_Data_Extractor enhanced_llm_extraction_app.py
   ```
5. Find the executable in the `dist` folder

### Linux Users

1. Download the latest release from the [Releases page](https://github.com/yourusername/EcoDataExtractorApp/releases)
2. Download the `LLM_Data_Extractor` file
3. Make it executable:
   ```bash
   chmod +x LLM_Data_Extractor
   ```
4. Run the application:
   ```bash
   ./LLM_Data_Extractor
   ```

#### Building the app yourself (Ubuntu/Linux)
1. Install Python 3.9 or later
2. Clone this repository
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install pyinstaller
   ```
4. Build the executable:
   ```bash
   python -m PyInstaller --onefile --windowed --name=LLM_Data_Extractor enhanced_llm_extraction_app.py
   ```
5. The executable will be in the `dist` directory.

## Configuration

1. Create an `app_config.json` file in the same directory as the executable
2. Add your API keys:
   ```json
   {
     "openai_api_key": "your-openai-key",
     "google_api_key": "your-google-key"
   }
   ```
   Note: You can also enter API keys through the application's GUI

## Usage

1. Launch the application
2. Enter your API keys if not already configured
3. Select your input file (PDF)
4. Choose the LLM provider
5. Click "Extract Data" to begin processing

## Building from Source

### Prerequisites
- Python 3.9 or later
- pip (Python package manager)
- Required Python packages (listed in requirements.txt)

### Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python enhanced_llm_extraction_app.py
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository. 