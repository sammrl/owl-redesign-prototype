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
import logging
from typing import Dict, Tuple, List, Optional, Any
from dotenv import load_dotenv, find_dotenv, set_key, unset_key

logger = logging.getLogger(__name__)

# Template for default environment file
DEFAULT_ENV_TEMPLATE = """#===========================================
# MODEL & API 
# (See https://docs.camel-ai.org/key_modules/models.html#)
#===========================================

# OPENAI API (https://platform.openai.com/api-keys)
OPENAI_API_KEY='Your_Key'
# OPENAI_API_BASE_URL=""

# Azure OpenAI API
# AZURE_OPENAI_BASE_URL=""
# AZURE_API_VERSION=""
# AZURE_OPENAI_API_KEY=""
# AZURE_DEPLOYMENT_NAME=""


# Qwen API (https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key)
QWEN_API_KEY='Your_Key'

# DeepSeek API (https://platform.deepseek.com/api_keys)
DEEPSEEK_API_KEY='Your_Key'

#===========================================
# Tools & Services API
#===========================================

# Google Search API (https://coda.io/@jon-dallas/google-image-search-pack-example/search-engine-id-and-google-api-key-3)
GOOGLE_API_KEY='Your_Key'
SEARCH_ENGINE_ID='Your_ID'

# Chunkr API (https://chunkr.ai/)
CHUNKR_API_KEY='Your_Key'

# Firecrawl API (https://www.firecrawl.dev/)
FIRECRAWL_API_KEY='Your_Key'
#FIRECRAWL_API_URL="https://api.firecrawl.dev"
"""

# Frontend configured environment variables
WEB_FRONTEND_ENV_VARS: Dict[str, str] = {}

def init_env_file() -> str:
    """Initialize .env file if it doesn't exist
    
    Returns:
        str: Path to the .env file
    """
    # Try to find an existing .env file
    dotenv_path = find_dotenv()
    
    # If no .env file is found, create one with default template
    if not dotenv_path:
        # Create .env file in the repository root
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        env_file_path = os.path.join(repo_root, ".env")
        
        with open(env_file_path, "w") as f:
            f.write(DEFAULT_ENV_TEMPLATE)
            
        dotenv_path = env_file_path
        logger.info(f"Created default .env file at {dotenv_path}")
    
    return dotenv_path

def get_env_vars() -> Dict[str, Tuple[str, str]]:
    """Get all environment variables
    
    Returns:
        Dict[str, Tuple[str, str]]: Dict with keys as variable names, values as (value, source) tuples
    """
    # Initialize .env file if it doesn't exist
    dotenv_path = init_env_file()
    
    # Load environment variables
    load_dotenv(dotenv_path, override=True)
    
    # Read environment variables from .env file
    env_file_vars = {}
    with open(dotenv_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    env_file_vars[key.strip()] = value.strip().strip("\"'")
    
    # Get system environment variables
    system_env_vars = {
        k: v
        for k, v in os.environ.items()
        if k not in env_file_vars and k not in WEB_FRONTEND_ENV_VARS
    }
    
    # Merge environment variables and mark sources
    env_vars = {}
    
    # Add system environment variables (lowest priority)
    for key, value in system_env_vars.items():
        env_vars[key] = (value, "System")
    
    # Add .env file environment variables (medium priority)
    for key, value in env_file_vars.items():
        env_vars[key] = (value, ".env file")
    
    # Add frontend configured environment variables (highest priority)
    for key, value in WEB_FRONTEND_ENV_VARS.items():
        env_vars[key] = (value, "Frontend configuration")
        # Ensure operating system environment variables are also updated
        os.environ[key] = value
    
    return env_vars

def set_env_var(key: str, value: str, from_frontend: bool = True) -> Tuple[bool, str]:
    """Add or update an environment variable
    
    Args:
        key: Variable name
        value: Variable value
        from_frontend: Whether the variable is set from the frontend
        
    Returns:
        Tuple[bool, str]: Success flag and status message
    """
    try:
        if not key or not key.strip():
            return False, "Variable name cannot be empty"
        
        key = key.strip()
        value = value.strip()
        
        # If from frontend, add to frontend environment variable dictionary
        if from_frontend:
            WEB_FRONTEND_ENV_VARS[key] = value
            # Also update system environment variable
            os.environ[key] = value
        
        # Update .env file
        dotenv_path = init_env_file()
        set_key(dotenv_path, key, value)
        
        # Reload environment variables
        load_dotenv(dotenv_path, override=True)
        
        logger.info(f"Environment variable '{key}' set to '{value}'")
        return True, f"Environment variable {key} has been successfully added/updated"
        
    except Exception as e:
        logger.error(f"Error setting environment variable '{key}': {str(e)}")
        return False, f"Error adding environment variable: {str(e)}"

def delete_env_var(key: str) -> Tuple[bool, str]:
    """Delete an environment variable
    
    Args:
        key: Variable name
        
    Returns:
        Tuple[bool, str]: Success flag and status message
    """
    try:
        if not key or not key.strip():
            return False, "Variable name cannot be empty"
        
        key = key.strip()
        
        # Delete from .env file
        dotenv_path = init_env_file()
        unset_key(dotenv_path, key)
        
        # Delete from frontend environment variable dictionary
        if key in WEB_FRONTEND_ENV_VARS:
            del WEB_FRONTEND_ENV_VARS[key]
        
        # Delete from process environment
        if key in os.environ:
            del os.environ[key]
            
        logger.info(f"Environment variable '{key}' deleted")
        return True, f"Environment variable {key} has been successfully deleted"
        
    except Exception as e:
        logger.error(f"Error deleting environment variable '{key}': {str(e)}")
        return False, f"Error deleting environment variable: {str(e)}"

def check_required_env_vars() -> Dict[str, List[str]]:
    """Check if required environment variables are set
    
    Returns:
        Dict[str, List[str]]: Dictionary with status and list of missing variables
    """
    # Define required environment variables for different features
    required_vars = {
        "openai": ["OPENAI_API_KEY"],
        "azure": ["AZURE_OPENAI_BASE_URL", "AZURE_API_VERSION", "AZURE_OPENAI_API_KEY", "AZURE_DEPLOYMENT_NAME"],
        "qwen": ["QWEN_API_KEY"],
        "deepseek": ["DEEPSEEK_API_KEY"],
        "search": ["GOOGLE_API_KEY", "SEARCH_ENGINE_ID"],
        "chunkr": ["CHUNKR_API_KEY"],
        "firecrawl": ["FIRECRAWL_API_KEY"],
    }
    
    # Get current environment variables
    current_vars = get_env_vars()
    
    # Check which required variables are missing or empty
    missing_vars = {}
    for feature, vars_list in required_vars.items():
        missing = []
        for var in vars_list:
            if var not in current_vars or not current_vars[var][0]:
                missing.append(var)
        
        if missing:
            missing_vars[feature] = missing
    
    # If any required variables are missing, return error
    if missing_vars:
        return {
            "status": "missing",
            "missing_vars": missing_vars
        }
    
    # All required variables are set
    return {
        "status": "ok"
    }
    
def is_api_related(key: str) -> bool:
    """Determine if an environment variable is API-related
    
    Args:
        key: Environment variable name
        
    Returns:
        bool: True if the variable is API-related, False otherwise
    """
    # API-related keywords
    api_keywords = [
        "api",
        "key",
        "token",
        "secret",
        "password",
        "openai",
        "qwen",
        "deepseek",
        "google",
        "search",
        "hf",
        "hugging",
        "chunkr",
        "firecrawl",
    ]
    
    # Check if it contains API-related keywords (case insensitive)
    return any(keyword in key.lower() for keyword in api_keywords)

def get_api_guide(key: str) -> str:
    """Return the corresponding API guide based on the environment variable name
    
    Args:
        key: Environment variable name
        
    Returns:
        str: API guide link or description
    """
    key_lower = key.lower()
    
    if "openai" in key_lower:
        return "https://platform.openai.com/api-keys"
    elif "qwen" in key_lower or "dashscope" in key_lower:
        return "https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key"
    elif "deepseek" in key_lower:
        return "https://platform.deepseek.com/api_keys"
    elif "google" in key_lower:
        return "https://coda.io/@jon-dallas/google-image-search-pack-example/search-engine-id-and-google-api-key-3"
    elif "search_engine_id" in key_lower:
        return "https://coda.io/@jon-dallas/google-image-search-pack-example/search-engine-id-and-google-api-key-3"
    elif "chunkr" in key_lower:
        return "https://chunkr.ai/"
    elif "firecrawl" in key_lower:
        return "https://www.firecrawl.dev/"
    else:
        return ""

def get_api_related_vars() -> List[Dict[str, Any]]:
    """Get API-related environment variables
    
    Returns:
        List[Dict[str, Any]]: List of API-related environment variables
    """
    env_vars = get_env_vars()
    
    # Filter out API-related environment variables
    api_env_vars = {k: v for k, v in env_vars.items() if is_api_related(k)}
    
    # Convert to list format
    result = []
    for k, v in api_env_vars.items():
        value, source = v
        guide = get_api_guide(k)
        
        result.append({
            "key": k,
            "value": value,
            "source": source,
            "guide": guide
        })
    
    return result