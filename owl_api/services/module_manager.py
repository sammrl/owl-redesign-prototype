#!/usr/bin/env python3
# ========= Copyright 2023-2024 @ CAMEL-AI.org. All Rights Reserved. =========
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ========= Copyright 2023-2024 @ CAMEL-AI.org. All Rights Reserved. =========

import os
import sys
import importlib
import inspect
import logging
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Default module descriptions from Gradio app
DEFAULT_MODULE_DESCRIPTIONS = {
    "run": "Default mode: Using OpenAI model's default agent collaboration mode, suitable for most tasks.",
    "run_mini": "Using OpenAI model with minimal configuration to process tasks",
    "run_deepseek_zh": "Using deepseek model to process Chinese tasks",
    "run_openai_compatible_model": "Using openai compatible model to process tasks",
    "run_ollama": "Using local ollama model to process tasks",
    "run_qwen_mini_zh": "Using qwen model with minimal configuration to process tasks",
    "run_qwen_zh": "Using qwen model to process tasks",
    "run_azure_openai": "Using azure openai model to process tasks",
    "run_groq": "Using groq model to process tasks",
}

def get_examples_directory() -> str:
    """Get the path to the examples directory
    
    Returns:
        str: Path to the examples directory
    """
    # Get the repository root
    repo_root = Path(__file__).parent.parent.parent
    examples_dir = os.path.join(repo_root, "examples")
    
    return examples_dir

def extract_docstring_description(module_path: str) -> Optional[str]:
    """Extract description from module docstring
    
    Args:
        module_path: Import path to the module
        
    Returns:
        Optional[str]: Description extracted from docstring, or None if no docstring is found
    """
    try:
        # Import the module
        module = importlib.import_module(module_path)
        
        # Check if the module has a docstring
        if module.__doc__:
            # Extract the first line or paragraph from the docstring
            docstring = module.__doc__.strip()
            description = docstring.split('\n\n')[0].strip()
            return description
        
        # Check if construct_society function has a docstring
        if hasattr(module, 'construct_society') and module.construct_society.__doc__:
            docstring = module.construct_society.__doc__.strip()
            description = docstring.split('\n\n')[0].strip()
            return description
            
        return None
        
    except Exception as e:
        logger.error(f"Error extracting docstring from {module_path}: {str(e)}")
        return None

def discover_modules() -> Dict[str, str]:
    """Discover available modules in examples directory
    
    Returns:
        Dict[str, str]: Dictionary of module names and descriptions
    """
    try:
        examples_dir = get_examples_directory()
        modules = {}
        
        # Find all Python files in the examples directory
        for filename in os.listdir(examples_dir):
            if filename.endswith('.py') and filename != '__init__.py':
                module_name = filename[:-3]  # Remove .py extension
                
                # Skip if module does not match run_* or run pattern
                if not (module_name == 'run' or module_name.startswith('run_')):
                    continue
                    
                # Try to get description from docstring
                module_path = f"examples.{module_name}"
                description = extract_docstring_description(module_path)
                
                # If no docstring description, use default description or generic one
                if not description:
                    description = DEFAULT_MODULE_DESCRIPTIONS.get(
                        module_name, f"Module for {module_name.replace('_', ' ')}"
                    )
                    
                modules[module_name] = description
        
        return modules
        
    except Exception as e:
        logger.error(f"Error discovering modules: {str(e)}")
        # Fall back to default module descriptions
        return DEFAULT_MODULE_DESCRIPTIONS

def extract_module_metadata(module_path: str) -> Dict[str, Any]:
    """Extract metadata from a module
    
    Args:
        module_path: Import path to the module
        
    Returns:
        Dict[str, Any]: Module metadata
    """
    try:
        # Import the module
        module = importlib.import_module(module_path)
        
        # Basic metadata
        metadata = {
            "name": module_path.split('.')[-1],
            "fullpath": module_path,
            "has_construct_society": hasattr(module, 'construct_society'),
        }
        
        # Description from docstring
        if module.__doc__:
            metadata["description"] = module.__doc__.strip()
        elif hasattr(module, 'construct_society') and module.construct_society.__doc__:
            metadata["description"] = module.construct_society.__doc__.strip()
        else:
            metadata["description"] = DEFAULT_MODULE_DESCRIPTIONS.get(
                metadata["name"], f"Module for {metadata['name'].replace('_', ' ')}"
            )
            
        # Check for model information in construct_society function
        if hasattr(module, 'construct_society'):
            func = module.construct_society
            source = inspect.getsource(func)
            
            # Extract model information using regex
            model_matches = re.findall(r"ModelType\.([A-Z0-9_]+)", source)
            if model_matches:
                metadata["models"] = list(set(model_matches))
                
            # Extract platform information
            platform_matches = re.findall(r"ModelPlatformType\.([A-Z0-9_]+)", source)
            if platform_matches:
                metadata["platforms"] = list(set(platform_matches))
                
        return metadata
        
    except Exception as e:
        logger.error(f"Error extracting metadata from {module_path}: {str(e)}")
        return {
            "name": module_path.split('.')[-1],
            "fullpath": module_path,
            "has_construct_society": False,
            "description": f"Error extracting metadata: {str(e)}"
        }

def get_module_info(module_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific module
    
    Args:
        module_name: Name of the module
        
    Returns:
        Dict[str, Any]: Detailed module information
    """
    module_path = f"examples.{module_name}"
    return extract_module_metadata(module_path)

def get_available_modules() -> Dict[str, str]:
    """Get a dictionary of available modules and their descriptions
    
    Returns:
        Dict[str, str]: Dictionary of module names and descriptions
    """
    return discover_modules()