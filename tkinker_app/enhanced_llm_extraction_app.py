#!/usr/bin/env python3
"""
Enhanced LLM Data Extraction Desktop Application

Features:
- Folder/File dropdown selection
- CSV format filtering
- Paper ID column selection
- Text column dropdown from CSV
- Multiple categorical value extraction
- Model selection dropdown
- API key input with auto-save
- Automatic results saving
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import pandas as pd
import os
import json
import threading
from typing import Dict, Any, List, Optional
from datetime import datetime
import queue
import time
import requests
from abc import ABC, abstractmethod

# Try to import optional dependencies
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

# Configuration file for storing API keys and settings
CONFIG_FILE = "app_config.json"

# Base class for LLM providers
class LLMProvider(ABC):
    def __init__(self, model_name: str, api_key: Optional[str] = None, base_url: Optional[str] = None, temperature: Optional[float] = None):
        self.model_name = model_name
        self.api_key = api_key
        self.base_url = base_url
        self.temperature = temperature
        self.setup_client()
    
    def _get_generation_params(self) -> Dict[str, Any]:
        """Get generation parameters, including temperature if supported"""
        params = {}
        if self.temperature is not None:
            params["temperature"] = self.temperature
        return params
    
    @abstractmethod
    def setup_client(self):
        """Setup the client for the specific provider"""
        pass
    
    @abstractmethod
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        """Generate response from the model"""
        pass

# OpenAI Provider
class OpenAIProvider(LLMProvider):
    def setup_client(self):
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        except ImportError:
            raise ImportError("OpenAI library not installed. Please install: pip install openai")
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        start_time = time.time()
        generation_params = self._get_generation_params()
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a research assistant specialized in data extraction. You carefully read the text you are given, extract the requested information from the text and you only respond in JSON format as instructed. You never make up data that is not present in the text."},
                    {"role": "user", "content": prompt}
                ],
                **generation_params
            )
            end_time = time.time()
            
            return {
                "response": response.choices[0].message.content,
                "time_taken": end_time - start_time,
                "success": True
            }
        except Exception as e:
            return {
                "response": json.dumps({"error": f"OpenAI API error: {str(e)}"}),
                "time_taken": time.time() - start_time,
                "success": False
            }

# Google Provider
class GoogleProvider(LLMProvider):
    def setup_client(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        except ImportError:
            raise ImportError("Google AI library not installed. Please install: pip install google-generativeai")
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        start_time = time.time()
        generation_params = self._get_generation_params()
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=generation_params
            )
            end_time = time.time()
            
            return {
                "response": response.text,
                "time_taken": end_time - start_time,
                "success": True
            }
        except Exception as e:
            return {
                "response": json.dumps({"error": f"Google API error: {str(e)}"}),
                "time_taken": time.time() - start_time,
                "success": False
            }

# DeepSeek Provider (using OpenAI-compatible API)
class DeepSeekProvider(LLMProvider):
    def setup_client(self):
        try:
            from openai import OpenAI
            if not self.api_key:
                raise ValueError("DeepSeek API key is required. Please set it when creating the provider.")
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url or "https://api.deepseek.com/v1"
            )
        except ImportError:
            raise ImportError("OpenAI library not installed. Please install: pip install openai")
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a research assistant specialized in data extraction. You carefully read the text you are given, extract the requested information from the text and you only respond in JSON format as instructed. You never make up data that is not present in the text."},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature
            )
            end_time = time.time()
            
            return {
                "response": response.choices[0].message.content,
                "time_taken": end_time - start_time,
                "success": True
            }
        except Exception as e:
            return {
                "response": json.dumps({"error": f"DeepSeek API error: {str(e)}"}),
                "time_taken": time.time() - start_time,
                "success": False
            }

# Grok Provider
class GrokProvider(LLMProvider):
    def setup_client(self):
        try:
            from openai import OpenAI
            if not self.api_key:
                raise ValueError("Grok API key is required. Please set it when creating the provider.")
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.x.ai/v1"
            )
        except ImportError:
            raise ImportError("OpenAI library not installed. Please install: pip install openai")
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            generation_params = self._get_generation_params()
            
            # Special handling for Grok reasoning models
            if "grok-3" in self.model_name.lower():
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    reasoning_effort="high",
                    messages=[
                        {"role": "system", "content": "You are a research assistant specialized in data extraction. You carefully read the text you are given, extract the requested information from the text and you only respond in JSON format as instructed. You never make up data that is not present in the text."},
                        {"role": "user", "content": prompt}
                    ],
                    **generation_params
                )
            else:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": "You are a research assistant specialized in data extraction. You carefully read the text you are given, extract the requested information from the text and you only respond in JSON format as instructed. You never make up data that is not present in the text."},
                        {"role": "user", "content": prompt}
                    ],
                    **generation_params
                )
            
            end_time = time.time()
            
            return {
                "response": response.choices[0].message.content,
                "time_taken": end_time - start_time,
                "success": True
            }
            
        except Exception as e:
            return {
                "response": json.dumps({"error": f"Grok API error: {str(e)}"}),
                "time_taken": time.time() - start_time,
                "success": False
            }

# Ollama Provider
class OllamaProvider(LLMProvider):
    def setup_client(self):
        try:
            import requests
            self.base_url = self.base_url or "http://localhost:11434"
        except ImportError:
            raise ImportError("Requests library not installed. Please install: pip install requests")
    
    def generate_response(self, prompt: str) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            import requests
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": self.temperature
                }
            )
            response.raise_for_status()
            end_time = time.time()
            
            return {
                "response": response.json().get("response", ""),
                "time_taken": end_time - start_time,
                "success": True
            }
        except Exception as e:
            return {
                "response": json.dumps({"error": f"Ollama API error: {str(e)}"}),
                "time_taken": time.time() - start_time,
                "success": False
            }

class LLMExtractionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("EcoData Extractor")
        self.root.geometry("900x700")
        
        # Configuration
        self.config_file = "app_config.json"
        self.load_config()
        
        # Data variables
        self.file_path = ""
        self.folder_path = ""
        self.csv_columns = []
        self.categorical_fields = []  # List of {"name": str, "prompt": str, "expected_values": list}
        self.processing = False
        
        # Model configurations
        self.model_configs = {
            "OpenAI": {
                "models": ["gpt-4o", "gpt-4o-mini", "o4-mini", "gpt-4.1", "Other"],
                "requires_api_key": True
            },
            "Google": {
                "models": ["gemini-2.5-pro-preview-03-25", "gemini-2.0-flash-001", "Other"],
                "requires_api_key": True
            },
            "DeepSeek": {
                "models": ["deepseek-chat", "deepseek-reasoner", "Other"],
                "requires_api_key": True
            },
            "Grok": {
                "models": ["grok-3-mini-fast", "Other"],
                "requires_api_key": True
            }
        }
        
        self.setup_ui()
        
    def load_config(self):
        """Load configuration from file"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    self.config = json.load(f)
            else:
                self.config = {}
        except Exception as e:
            messagebox.showerror("Config Error", f"Error loading config: {str(e)}")
            self.config = {}
    
    def save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            messagebox.showerror("Config Error", f"Error saving config: {str(e)}")
    
    def setup_ui(self):
        # --- App Title and Tagline ---
        self.root.title("EcoData Extractor")
        
        # Title and tagline at the top
        title_frame = tk.Frame(self.root, bg='white')
        title_frame.pack(fill=tk.X, pady=(10, 0))
        title_label = tk.Label(title_frame, text="EcoData Extractor", font=("Arial", 22, "bold"), bg='white')
        title_label.pack(pady=(0, 0))
        tagline_label = tk.Label(title_frame, text="Automatically extract structured ecological and biological information from unstructured text.", font=("Arial", 12, "italic"), bg='white', fg='#444')
        tagline_label.pack(pady=(0, 10))
        
        # Main container for scrollable form (fills window, left-aligned, responsive width)
        main_container = tk.Frame(self.root, bg='white')
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Canvas and scrollbar for scrolling
        canvas = tk.Canvas(main_container, highlightthickness=0, bd=0, bg='white')
        scrollbar = ttk.Scrollbar(main_container, orient=tk.VERTICAL, command=canvas.yview)
        
        # Frame inside canvas for form content
        scrollable_frame = ttk.Frame(canvas)
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        # Responsive: always fill width
        def resize_canvas(event):
            canvas.itemconfig("form_frame", width=event.width)
        canvas.bind('<Configure>', resize_canvas)
        
        # Add the form frame to the canvas
        form_window = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", tags="form_frame")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Mouse wheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        self.root.bind("<MouseWheel>", _on_mousewheel)
        canvas.bind("<MouseWheel>", _on_mousewheel)
        
        # Layout: scrollbar right, canvas fills rest
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=0, pady=0)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=0, pady=0)
        
        # File/Folder Selection Section
        file_frame = ttk.LabelFrame(scrollable_frame, text="Data Source Selection", padding="10")
        file_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.source_type = tk.StringVar(value="csv")
        ttk.Radiobutton(file_frame, text="Single CSV File", variable=self.source_type, 
                       value="csv", command=self.on_source_change).pack(anchor=tk.W)
        ttk.Radiobutton(file_frame, text="Folder with PDF Files", variable=self.source_type, 
                       value="pdf", command=self.on_source_change).pack(anchor=tk.W)
        
        # File/Folder path display and selection
        self.path_frame = ttk.Frame(file_frame)
        self.path_frame.pack(fill=tk.X, pady=5)
        
        self.path_label = ttk.Label(self.path_frame, text="No file/folder selected")
        self.path_label.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        self.browse_button = ttk.Button(self.path_frame, text="Browse", command=self.browse_file_folder)
        self.browse_button.pack(side=tk.RIGHT)
        
        # Column Configuration (CSV only)
        self.column_frame = ttk.LabelFrame(scrollable_frame, text="Column Configuration", padding="10")
        self.column_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # ID Column
        ttk.Label(self.column_frame, text="Paper ID Column:").pack(anchor=tk.W)
        self.id_column_var = tk.StringVar()
        self.id_column_combo = ttk.Combobox(self.column_frame, textvariable=self.id_column_var, state="readonly")
        self.id_column_combo.pack(fill=tk.X, pady=(0, 10))
        
        # Text Column
        ttk.Label(self.column_frame, text="Text Column:").pack(anchor=tk.W)
        self.text_column_var = tk.StringVar()
        self.text_column_combo = ttk.Combobox(self.column_frame, textvariable=self.text_column_var, state="readonly")
        self.text_column_combo.pack(fill=tk.X)
        
        # Categorical Fields Section
        cat_frame = ttk.LabelFrame(scrollable_frame, text="Categorical Extraction Fields", padding="10")
        cat_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Field entry
        entry_frame = ttk.Frame(cat_frame)
        entry_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(entry_frame, text="Category Name:").pack(anchor=tk.W)
        self.category_name_entry = ttk.Entry(entry_frame)
        self.category_name_entry.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(entry_frame, text="Custom Prompt (use [CATEGORY_NAME] as placeholder):").pack(anchor=tk.W)
        self.prompt_text = scrolledtext.ScrolledText(entry_frame, height=4)
        self.prompt_text.pack(fill=tk.X, pady=(0, 5))
        self.prompt_text.insert("1.0", "Extract the [CATEGORY_NAME] from this text. Return the result as a JSON field.")
        
        ttk.Label(entry_frame, text="Expected Values (optional, comma-separated):").pack(anchor=tk.W)
        self.expected_values_entry = ttk.Entry(entry_frame)
        self.expected_values_entry.pack(fill=tk.X, pady=(0, 5))
        
        button_frame = ttk.Frame(entry_frame)
        button_frame.pack(fill=tk.X)
        ttk.Button(button_frame, text="Add Category", command=self.add_category).pack(side=tk.LEFT)
        ttk.Button(button_frame, text="Clear All", command=self.clear_categories).pack(side=tk.LEFT, padx=(5, 0))
        ttk.Button(button_frame, text="Preview Prompt", command=self.preview_prompt).pack(side=tk.LEFT, padx=(5, 0))
        
        # Categories list
        self.categories_listbox = tk.Listbox(cat_frame, height=6)
        self.categories_listbox.pack(fill=tk.X, pady=(10, 0))
        self.categories_listbox.bind('<Double-Button-1>', self.edit_category)
        
        # Selected category details
        self.category_details = scrolledtext.ScrolledText(cat_frame, height=4, state=tk.DISABLED)
        self.category_details.pack(fill=tk.X, pady=(5, 0))
        
        # Prompt options
        prompt_options_frame = ttk.Frame(cat_frame)
        prompt_options_frame.pack(fill=tk.X, pady=(5, 0))
        
        self.save_prompts_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(prompt_options_frame, text="Save prompts with results", 
                       variable=self.save_prompts_var).pack(anchor=tk.W)
        
        self.truncate_text_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(prompt_options_frame, text="Truncate long text in saved prompts (recommended for PDFs)", 
                       variable=self.truncate_text_var).pack(anchor=tk.W)
        
        # Text truncation options
        truncate_frame = ttk.Frame(prompt_options_frame)
        truncate_frame.pack(fill=tk.X, pady=(5, 0))
        
        ttk.Label(truncate_frame, text="Max text length in saved prompts:").pack(side=tk.LEFT)
        self.max_text_length = tk.IntVar(value=500)
        ttk.Spinbox(truncate_frame, from_=100, to=2000, textvariable=self.max_text_length, 
                   width=10).pack(side=tk.LEFT, padx=(5, 0))
        
        # Model Configuration Section
        model_frame = ttk.LabelFrame(scrollable_frame, text="Model Configuration", padding="10")
        model_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Provider selection
        ttk.Label(model_frame, text="Model Provider:").pack(anchor=tk.W)
        self.provider_var = tk.StringVar()
        self.provider_combo = ttk.Combobox(model_frame, textvariable=self.provider_var, 
                                          values=list(self.model_configs.keys()), state="readonly")
        self.provider_combo.pack(fill=tk.X, pady=(0, 10))
        self.provider_combo.bind('<<ComboboxSelected>>', self.on_provider_change)
        
        # Model selection
        ttk.Label(model_frame, text="Model:").pack(anchor=tk.W)
        self.model_var = tk.StringVar()
        self.model_combo = ttk.Combobox(model_frame, textvariable=self.model_var, state="readonly")
        self.model_combo.pack(fill=tk.X, pady=(0, 10))
        self.model_combo.bind('<<ComboboxSelected>>', self.on_model_change)
        
        # Custom model name entry (hidden by default)
        self.custom_model_frame = ttk.Frame(model_frame)
        self.custom_model_label = ttk.Label(self.custom_model_frame, text="Custom Model Name:")
        self.custom_model_entry = ttk.Entry(self.custom_model_frame)
        self.custom_model_label.pack(side=tk.LEFT)
        self.custom_model_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 0))
        self.custom_model_frame.pack_forget()
        
        # API Key
        self.api_key_frame = ttk.Frame(model_frame)
        self.api_key_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(self.api_key_frame, text="API Key:").pack(anchor=tk.W)
        self.api_key_entry = ttk.Entry(self.api_key_frame, show="*")
        self.api_key_entry.pack(fill=tk.X)
        
        # Temperature setting
        temp_frame = ttk.Frame(model_frame)
        temp_frame.pack(fill=tk.X)
        
        ttk.Label(temp_frame, text="Temperature:").pack(side=tk.LEFT)
        self.temperature_var = tk.DoubleVar(value=0.0)
        temp_spinbox = ttk.Spinbox(temp_frame, from_=0.0, to=2.0, increment=0.1, 
                                  textvariable=self.temperature_var, width=10)
        temp_spinbox.pack(side=tk.LEFT, padx=(5, 0))
        
        # Output Configuration Section
        output_frame = ttk.LabelFrame(scrollable_frame, text="Output Configuration", padding="10")
        output_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Output directory
        output_dir_frame = ttk.Frame(output_frame)
        output_dir_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(output_dir_frame, text="Output Directory:").pack(anchor=tk.W)
        self.output_dir_var = tk.StringVar(value=os.getcwd())
        ttk.Entry(output_dir_frame, textvariable=self.output_dir_var, state="readonly").pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(output_dir_frame, text="Browse", command=self.browse_output_dir).pack(side=tk.RIGHT)
        
        # Processing Section
        process_frame = ttk.LabelFrame(scrollable_frame, text="Processing", padding="10")
        process_frame.pack(fill=tk.X, padx=10, pady=5)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(process_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.pack(fill=tk.X, pady=(0, 10))
        
        # Status label
        self.status_label = ttk.Label(process_frame, text="Ready to process")
        self.status_label.pack(anchor=tk.W, pady=(0, 10))
        
        # Process button
        self.process_button = ttk.Button(process_frame, text="Start Processing", command=self.start_processing)
        self.process_button.pack()
        
        # Load saved settings
        self.load_saved_settings()
        
    def on_source_change(self):
        """Handle source type change"""
        if self.source_type.get() == "csv":
            self.column_frame.pack(fill=tk.X, padx=10, pady=5)
        else:
            self.column_frame.pack_forget()
    
    def browse_file_folder(self):
        """Browse for file or folder based on source type"""
        if self.source_type.get() == "csv":
            file_path = filedialog.askopenfilename(
                title="Select CSV File",
                filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
            )
            if file_path:
                self.file_path = file_path
                self.path_label.config(text=os.path.basename(file_path))
                self.load_csv_columns()
        else:
            folder_path = filedialog.askdirectory(title="Select Folder with PDF Files")
            if folder_path:
                self.folder_path = folder_path
                self.path_label.config(text=os.path.basename(folder_path))
    
    def load_csv_columns(self):
        """Load CSV columns for selection"""
        try:
            # Try multiple encodings
            encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(self.file_path, encoding=encoding, nrows=0)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                # Last resort - read with error replacement
                df = pd.read_csv(self.file_path, encoding='utf-8', errors='replace', nrows=0)
            
            # Clean column names (remove BOM if present)
            df.columns = [col.replace('\ufeff', '') for col in df.columns]
            
            self.csv_columns = df.columns.tolist()
            self.id_column_combo['values'] = self.csv_columns
            self.text_column_combo['values'] = self.csv_columns
            
            # Auto-select likely columns
            for col in self.csv_columns:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['id', 'paper']):
                    self.id_column_var.set(col)
                elif any(keyword in col_lower for keyword in ['text', 'abstract', 'content']):
                    self.text_column_var.set(col)
                    
        except Exception as e:
            messagebox.showerror("Error", f"Error loading CSV file: {str(e)}")
    
    def add_category(self):
        """Add a new categorical field"""
        name = self.category_name_entry.get().strip()
        prompt = self.prompt_text.get("1.0", tk.END).strip()
        expected_values = [v.strip() for v in self.expected_values_entry.get().split(',') if v.strip()]
        
        if not name:
            messagebox.showerror("Error", "Please enter a category name")
            return
        
        if not prompt:
            messagebox.showerror("Error", "Please enter a prompt")
            return
        
        # Check if category already exists
        for field in self.categorical_fields:
            if field["name"] == name:
                messagebox.showerror("Error", f"Category '{name}' already exists")
                return
        
        self.categorical_fields.append({
            "name": name,
            "prompt": prompt,
            "expected_values": expected_values
        })
        
        self.update_categories_display()
        
        # Clear entries
        self.category_name_entry.delete(0, tk.END)
        self.prompt_text.delete("1.0", tk.END)
        self.prompt_text.insert("1.0", "Extract the [CATEGORY_NAME] from this text. Return the result as a JSON field.")
        self.expected_values_entry.delete(0, tk.END)
    
    def update_categories_display(self):
        """Update the categories listbox and details"""
        self.categories_listbox.delete(0, tk.END)
        for field in self.categorical_fields:
            expected_str = f" (Expected: {', '.join(field['expected_values'])})" if field['expected_values'] else ""
            self.categories_listbox.insert(tk.END, f"{field['name']}{expected_str}")
        
        # Update details for first item if exists
        if self.categorical_fields:
            self.categories_listbox.selection_set(0)
            self.show_category_details(0)
    
    def edit_category(self, event):
        """Edit selected category"""
        selection = self.categories_listbox.curselection()
        if selection:
            index = selection[0]
            field = self.categorical_fields[index]
            
            # Populate edit fields
            self.category_name_entry.delete(0, tk.END)
            self.category_name_entry.insert(0, field["name"])
            
            self.prompt_text.delete("1.0", tk.END)
            self.prompt_text.insert("1.0", field["prompt"])
            
            self.expected_values_entry.delete(0, tk.END)
            if field["expected_values"]:
                self.expected_values_entry.insert(0, ", ".join(field["expected_values"]))
            
            # Remove the old field
            del self.categorical_fields[index]
            self.update_categories_display()
    
    def show_category_details(self, index):
        """Show details for selected category"""
        if index < len(self.categorical_fields):
            field = self.categorical_fields[index]
            details = f"Name: {field['name']}\n\n"
            details += f"Prompt: {field['prompt']}\n\n"
            if field['expected_values']:
                details += f"Expected Values: {', '.join(field['expected_values'])}"
            
            self.category_details.config(state=tk.NORMAL)
            self.category_details.delete("1.0", tk.END)
            self.category_details.insert("1.0", details)
            self.category_details.config(state=tk.DISABLED)
    
    def clear_categories(self):
        """Clear all categories"""
        if messagebox.askyesno("Confirm", "Clear all categories?"):
            self.categorical_fields = []
            self.update_categories_display()
            self.category_details.config(state=tk.NORMAL)
            self.category_details.delete("1.0", tk.END)
            self.category_details.config(state=tk.DISABLED)
    
    def on_provider_change(self, event=None):
        """Handle provider selection change"""
        provider = self.provider_var.get()
        if provider in self.model_configs:
            models = self.model_configs[provider]["models"]
            self.model_combo['values'] = models
            if models:
                self.model_var.set(models[0])
            
            # Show/hide API key based on provider
            if self.model_configs[provider]["requires_api_key"]:
                self.api_key_frame.pack(fill=tk.X, pady=(0, 10))
                # Load saved API key
                key_name = f"{provider.lower()}_api_key"
                if key_name in self.config:
                    self.api_key_entry.delete(0, tk.END)
                    self.api_key_entry.insert(0, self.config[key_name])
            else:
                self.api_key_frame.pack_forget()
        # Hide custom model entry if provider changes
        self.custom_model_frame.pack_forget()
    
    def on_model_change(self, event=None):
        """Show custom model entry if 'Other' is selected"""
        if self.model_var.get() == "Other":
            self.custom_model_frame.pack(fill=tk.X, pady=(0, 10))
        else:
            self.custom_model_frame.pack_forget()
    
    def browse_output_dir(self):
        """Browse for output directory"""
        directory = filedialog.askdirectory(title="Select Output Directory")
        if directory:
            self.output_dir_var.set(directory)
    
    def construct_extraction_prompt(self, text: str) -> str:
        """Construct the extraction prompt with all categorical fields"""
        if not self.categorical_fields:
            return ""
        
        # Build the prompt sections
        prompt_parts = []
        prompt_parts.append("Extract information from the following text. Your task is to perform the following actions:")
        prompt_parts.append("")
        prompt_parts.append("1. Read the content of the text in its entirety")
        prompt_parts.append("")
        prompt_parts.append("2. Extract the following information:")
        prompt_parts.append("")
        
        # Add each categorical field
        for i, field in enumerate(self.categorical_fields, 1):
            field_prompt = field["prompt"].replace("[CATEGORY_NAME]", field["name"])
            prompt_parts.append(f"   Field {i} - {field['name']}: {field_prompt}")
            
            if field["expected_values"]:
                expected_str = '", "'.join(field["expected_values"])
                prompt_parts.append(f"   Expected values: [\"{expected_str}\", \"NA\"]")
            
            prompt_parts.append("")
        
        prompt_parts.append("3. Output your response as a JSON object in the following format:")
        
        # Build JSON structure
        json_structure = {}
        for field in self.categorical_fields:
            if field["expected_values"]:
                json_structure[field["name"]] = f"RETURN ONLY ITEMS FROM THE LIST {field['expected_values'] + ['NA']}"
            else:
                json_structure[field["name"]] = f"Extracted {field['name']} or 'NA' if not found"
        
        prompt_parts.append("")
        prompt_parts.append(json.dumps(json_structure, indent=2))
        prompt_parts.append("")
        prompt_parts.append("The text to analyze is delimited with triple backticks:")
        prompt_parts.append("")
        prompt_parts.append(f"```{text}```")
        
        return "\n".join(prompt_parts)
    
    def get_llm_provider(self):
        """Get the configured LLM provider"""
        provider_name = self.provider_var.get()
        model_name = self.model_var.get()
        if model_name == "Other":
            model_name = self.custom_model_entry.get().strip()
        api_key = self.api_key_entry.get() if self.model_configs[provider_name]["requires_api_key"] else None
        temperature = self.temperature_var.get()
        
        if provider_name == "OpenAI":
            return OpenAIProvider(model_name, api_key, temperature=temperature)
        elif provider_name == "Google":
            return GoogleProvider(model_name, api_key, temperature=temperature)
        elif provider_name == "DeepSeek":
            return DeepSeekProvider(model_name, api_key, temperature=temperature)
        elif provider_name == "Grok":
            return GrokProvider(model_name, api_key, temperature=temperature)
        else:
            raise ValueError(f"Unknown provider: {provider_name}")
    
    def extract_pdf_text(self, pdf_path: str) -> str:
        """Extract text from PDF file"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except Exception as e:
            return f"Error extracting PDF: {str(e)}"
    
    def validate_inputs(self):
        """Validate all inputs before processing"""
        if self.source_type.get() == "csv":
            if not self.file_path:
                return "Please select a CSV file"
            if not self.id_column_var.get():
                return "Please select an ID column"
            if not self.text_column_var.get():
                return "Please select a text column"
        else:
            if not self.folder_path:
                return "Please select a folder with PDF files"
        
        if not self.categorical_fields:
            return "Please add at least one categorical field"
        
        if not self.provider_var.get():
            return "Please select a model provider"
        
        if not self.model_var.get():
            return "Please select a model"
        
        provider_name = self.provider_var.get()
        if self.model_configs[provider_name]["requires_api_key"] and not self.api_key_entry.get():
            return f"Please enter {provider_name} API key"
        
        return None
    
    def start_processing(self):
        """Start the processing in a separate thread"""
        error = self.validate_inputs()
        if error:
            messagebox.showerror("Validation Error", error)
            return
        
        if self.processing:
            messagebox.showwarning("Processing", "Processing is already in progress")
            return
        
        # Save API key
        provider_name = self.provider_var.get()
        if self.model_configs[provider_name]["requires_api_key"]:
            key_name = f"{provider_name.lower()}_api_key"
            self.config[key_name] = self.api_key_entry.get()
            self.save_config()
        
        self.processing = True
        self.process_button.config(state=tk.DISABLED)
        
        # Start processing thread
        thread = threading.Thread(target=self.process_data, daemon=True)
        thread.start()
    
    def process_data(self):
        """Process the data (runs in separate thread)"""
        try:
            # Get LLM provider
            provider = self.get_llm_provider()
            
            # Prepare data
            if self.source_type.get() == "csv":
                data_items = self.load_csv_data()
            else:
                data_items = self.load_pdf_data()
            
            total_items = len(data_items)
            if total_items == 0:
                self.update_status("No data to process")
                return
            
            results = []
            
            # Process each item
            for i, item in enumerate(data_items):
                self.update_status(f"Processing item {i+1}/{total_items}: {item['id']}")
                self.update_progress((i / total_items) * 100)
                
                # Construct prompt
                prompt = self.construct_extraction_prompt(item['text'])
                
                # Get LLM response
                response = provider.generate_response(prompt)
                
                # Parse response
                result = self.parse_llm_response(item['id'], response, item.get('file_path', ''), prompt)
                results.append(result)
            
            # Save results
            self.save_results(results)
            self.update_status(f"Processing completed! {len(results)} items processed.")
            self.update_progress(100)
            
            messagebox.showinfo("Success", f"Processing completed successfully!\nResults saved to output directory.")
            
        except Exception as e:
            self.update_status(f"Error: {str(e)}")
            messagebox.showerror("Processing Error", f"An error occurred during processing:\n{str(e)}")
        finally:
            self.processing = False
            self.process_button.config(state=tk.NORMAL)
    
    def load_csv_data(self):
        """Load data from CSV file"""
        # Try multiple encodings
        encodings = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        df = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv(self.file_path, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            # Last resort
            df = pd.read_csv(self.file_path, encoding='utf-8', errors='replace')
        
        # Clean column names
        df.columns = [col.replace('\ufeff', '') for col in df.columns]
        
        id_col = self.id_column_var.get()
        text_col = self.text_column_var.get()
        
        data_items = []
        for _, row in df.iterrows():
            data_items.append({
                'id': str(row[id_col]),
                'text': str(row[text_col])
            })
        
        return data_items
    
    def load_pdf_data(self):
        """Load data from PDF files"""
        data_items = []
        pdf_files = [f for f in os.listdir(self.folder_path) if f.lower().endswith('.pdf')]
        
        for pdf_file in pdf_files:
            pdf_path = os.path.join(self.folder_path, pdf_file)
            text = self.extract_pdf_text(pdf_path)
            
            data_items.append({
                'id': os.path.splitext(pdf_file)[0],  # Use filename without extension as ID
                'text': text,
                'file_path': pdf_path
            })
        
        return data_items
    
    def parse_llm_response(self, item_id: str, response: Dict[str, Any], file_path: str = "", prompt: str = ""):
        """Parse LLM response and extract categorical data"""
        result = {
            'ID': item_id,
            'model': f"{self.provider_var.get()}_{self.model_var.get()}",
            'processing_time': response.get('time_taken', 0),
            'success': response.get('success', False)
        }
        
        if file_path:
            result['file_path'] = file_path
        
        # Include prompt if option is enabled
        if self.save_prompts_var.get() and prompt:
            if self.truncate_text_var.get():
                # Truncate long text in prompts for readability
                max_length = self.max_text_length.get()
                if len(prompt) > max_length:
                    truncated_prompt = prompt[:max_length] + f"\n\n... [TEXT TRUNCATED - Original length: {len(prompt)} characters] ..."
                    result['prompt_sent'] = truncated_prompt
                else:
                    result['prompt_sent'] = prompt
            else:
                result['prompt_sent'] = prompt
        
        if response.get('success', False):
            try:
                # Clean and parse JSON response
                response_text = response['response']
                # Remove markdown code blocks if present
                response_text = response_text.replace('```json', '').replace('```', '').strip()
                
                # Include raw response if save prompts is enabled
                if self.save_prompts_var.get():
                    result['raw_llm_response'] = response['response']
                
                json_data = json.loads(response_text)
                
                # Extract each categorical field
                for field in self.categorical_fields:
                    field_name = field['name']
                    result[field_name] = json_data.get(field_name, 'NA')
                
            except json.JSONDecodeError as e:
                # If JSON parsing fails, mark as error and populate with NAs
                result['json_error'] = str(e)
                result['raw_response'] = response['response']
                for field in self.categorical_fields:
                    result[field['name']] = f'JSON_ERROR'
        else:
            # If LLM call failed, populate with error indicators
            result['llm_error'] = response.get('response', 'Unknown error')
            for field in self.categorical_fields:
                result[field['name']] = 'LLM_ERROR'
        
        return result
    
    def save_results(self, results: List[Dict[str, Any]]):
        """Save results to CSV file"""
        if not results:
            return
        
        df = pd.DataFrame(results)
        
        # Generate output filename with timestamp
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        source_name = "csv" if self.source_type.get() == "csv" else "pdf"
        provider_name = self.provider_var.get()
        model_name = self.model_var.get().replace("/", "_")
        
        filename = f"extraction_results_{source_name}_{provider_name}_{model_name}_{timestamp}.csv"
        output_path = os.path.join(self.output_dir_var.get(), filename)
        
        df.to_csv(output_path, index=False)
        self.update_status(f"Results saved to: {output_path}")
    
    def update_status(self, message: str):
        """Update status label (thread-safe)"""
        self.root.after(0, lambda: self.status_label.config(text=message))
    
    def update_progress(self, value: float):
        """Update progress bar (thread-safe)"""
        self.root.after(0, lambda: self.progress_var.set(value))
    
    def load_saved_settings(self):
        """Load saved settings from config"""
        if 'output_directory' in self.config:
            self.output_dir_var.set(self.config['output_directory'])
        
        if 'default_provider' in self.config:
            self.provider_var.set(self.config['default_provider'])
            self.on_provider_change()
        
        if 'default_model' in self.config:
            self.model_var.set(self.config['default_model'])

    def preview_prompt(self):
        """Preview the constructed prompt"""
        if not self.categorical_fields:
            messagebox.showwarning("No Categories", "Please add at least one categorical field to preview the prompt.")
            return
        
        # Create a preview dialog
        preview_window = tk.Toplevel(self.root)
        preview_window.title("Prompt Preview")
        preview_window.geometry("800x600")
        preview_window.transient(self.root)
        preview_window.grab_set()
        
        # Create frame with scrollbar
        main_frame = ttk.Frame(preview_window)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        ttk.Label(main_frame, text="Final Prompt that will be sent to the LLM:", 
                 font=("Arial", 12, "bold")).pack(anchor=tk.W, pady=(0, 10))
        
        # Sample text input
        sample_frame = ttk.Frame(main_frame)
        sample_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(sample_frame, text="Sample text (optional - use your own text to see realistic prompt):").pack(anchor=tk.W)
        sample_text = scrolledtext.ScrolledText(sample_frame, height=4)
        sample_text.pack(fill=tk.X, pady=(5, 10))
        sample_text.insert("1.0", "This is a sample research abstract about using drones for environmental monitoring in forests to study biodiversity patterns.")
        
        # Generate and update prompt button
        def update_preview():
            text_content = sample_text.get("1.0", tk.END).strip()
            if not text_content:
                text_content = "[YOUR TEXT WILL BE INSERTED HERE]"
            
            prompt = self.construct_extraction_prompt(text_content)
            
            preview_text.config(state=tk.NORMAL)
            preview_text.delete("1.0", tk.END)
            preview_text.insert("1.0", prompt)
            preview_text.config(state=tk.DISABLED)
        
        ttk.Button(sample_frame, text="Update Preview", command=update_preview).pack(anchor=tk.W)
        
        # Prompt display
        ttk.Label(main_frame, text="Generated Prompt:").pack(anchor=tk.W, pady=(10, 5))
        preview_text = scrolledtext.ScrolledText(main_frame, height=20, wrap=tk.WORD)
        preview_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Generate initial preview
        update_preview()
        
        # Copy to clipboard button
        def copy_to_clipboard():
            preview_window.clipboard_clear()
            preview_window.clipboard_append(preview_text.get("1.0", tk.END))
            messagebox.showinfo("Copied", "Prompt copied to clipboard!")
        
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X)
        ttk.Button(button_frame, text="Copy to Clipboard", command=copy_to_clipboard).pack(side=tk.LEFT)
        ttk.Button(button_frame, text="Close", command=preview_window.destroy).pack(side=tk.RIGHT)

if __name__ == "__main__":
    root = tk.Tk()
    app = LLMExtractionApp(root)
    root.mainloop() 