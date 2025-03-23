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
import sys
import os
import subprocess
import platform
from dotenv import load_dotenv

from camel.models import ModelFactory
from camel.toolkits import (
    BrowserToolkit,
)
from camel.types import ModelPlatformType, ModelType
from camel.logger import set_log_level

from owl.utils import run_society

from camel.societies import RolePlaying

import pathlib

base_dir = pathlib.Path(__file__).parent.parent
env_path = base_dir / "owl" / ".env"
load_dotenv(dotenv_path=str(env_path))

set_log_level(level="DEBUG")


def check_browsers():
    """Check for available browsers on the system"""
    print("\n" + "="*80)
    print("BROWSER AVAILABILITY CHECK")
    print("="*80)
    
    # Check common browser paths
    browser_paths = {
        "Chrome (macOS)": "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "Chrome (macOS alt)": "/Applications/Google Chrome.app/Contents/MacOS/chrome",
        "Firefox (macOS)": "/Applications/Firefox.app/Contents/MacOS/firefox",
        "Safari (macOS)": "/Applications/Safari.app/Contents/MacOS/Safari",
    }
    
    if platform.system() == "Windows":
        browser_paths = {
            "Chrome (Windows)": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "Chrome (Windows x86)": "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "Firefox (Windows)": "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
            "Edge (Windows)": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        }
    elif platform.system() == "Linux":
        browser_paths = {
            "Chrome (Linux)": "/usr/bin/google-chrome",
            "Chromium (Linux)": "/usr/bin/chromium-browser",
            "Firefox (Linux)": "/usr/bin/firefox",
        }
    
    found_browsers = False
    
    print("\nChecking standard browser locations:")
    print("-" * 50)
    for name, path in browser_paths.items():
        exists = os.path.exists(path)
        executable = os.access(path, os.X_OK) if exists else False
        status = "✅ FOUND & EXECUTABLE" if executable else "❌ NOT FOUND"
        print(f"{name}: {status}")
        print(f"  Path: {path}")
        
        if executable:
            found_browsers = True
    
    # On macOS, also check with mdfind
    if platform.system() == "Darwin":
        print("\nChecking for browser applications using mdfind:")
        print("-" * 50)
        
        browsers_to_check = [
            ("Chrome", "com.google.Chrome"),
            ("Firefox", "org.mozilla.firefox"),
            ("Safari", "com.apple.Safari"),
        ]
        
        for browser_name, bundle_id in browsers_to_check:
            try:
                result = subprocess.run(
                    ["mdfind", f"kMDItemCFBundleIdentifier == '{bundle_id}'"],
                    capture_output=True, text=True, timeout=5
                )
                if result.stdout.strip():
                    print(f"✅ {browser_name} found via mdfind: {result.stdout.strip()}")
                    found_browsers = True
                else:
                    print(f"❌ {browser_name} not found via mdfind")
            except Exception as e:
                print(f"Error checking for {browser_name}: {e}")
    
    # Check if we can use playwright
    print("\nChecking for Playwright browsers:")
    print("-" * 50)
    try:
        import playwright
        # Playwright version is stored in package metadata
        try:
            import pkg_resources
            try:
                playwright_version = pkg_resources.get_distribution("playwright").version
                print(f"✅ Playwright is installed (version: {playwright_version})")
            except pkg_resources.DistributionNotFound:
                print("✅ Playwright is installed (version: unknown)")
        except ImportError:
            print("✅ Playwright is installed")
        
        # Check for installed browsers
        try:
            result = subprocess.run(
                ["python", "-m", "playwright", "install", "--help"],
                capture_output=True, text=True, timeout=5
            )
            if "Usage" in result.stdout:
                print("✅ Playwright CLI is available")
            else:
                print("❌ Playwright CLI not working correctly")
        except Exception as e:
            print(f"❌ Error checking playwright CLI: {e}")
    except ImportError:
        print("❌ Playwright not installed")
    
    # Check for Selenium
    print("\nChecking for Selenium:")
    print("-" * 50)
    try:
        import selenium
        print(f"✅ Selenium is installed (version: {selenium.__version__})")
        
        # Try to import webdriver
        try:
            from selenium import webdriver
            print("✅ Selenium webdriver is available")
        except ImportError:
            print("❌ Selenium webdriver not available")
    except ImportError:
        print("❌ Selenium not installed")
    
    # Overall status
    print("\n" + "="*80)
    if found_browsers:
        print("✅ BROWSER CHECK RESULT: At least one browser was found on this system")
    else:
        print("❌ BROWSER CHECK RESULT: No browsers were found on this system")
        print("Please install Google Chrome or another browser to use browser features.")
    print("="*80 + "\n")
    
    return found_browsers


def construct_society(question: str) -> RolePlaying:
    r"""Construct a society of agents based on the given question.

    Args:
        question (str): The task or question to be addressed by the society.

    Returns:
        RolePlaying: A configured society of agents ready to address the
            question.
    """

    # Create models for different components
    models = {
        "user": ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI,
            model_type=ModelType.GPT_4O,
            model_config_dict={"temperature": 0},
        ),
        "assistant": ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI,
            model_type=ModelType.GPT_4O,
            model_config_dict={"temperature": 0},
        ),
        "browsing": ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI,
            model_type=ModelType.GPT_4O,
            model_config_dict={"temperature": 0},
        ),
    }

    # Configure toolkits - EXPLICITLY set headless=False for testing
    tools = [
        *BrowserToolkit(
            headless=False,  # Set to False to force visible browser
            web_agent_model=models["browsing"],
        ).get_tools(),
    ]

    # Configure agent roles and parameters
    user_agent_kwargs = {"model": models["user"]}
    
    # Enhanced prompt for assistant to use browser tools
    assistant_system_prompt = """You are a helpful assistant with direct access to browser tools. You MUST use these tools for ALL web-related tasks.

    CRITICAL BROWSER TOOL INSTRUCTIONS:
    - You MUST use browse_url(start_url='https://website.com') to visit websites
    - A visible Chrome window will open - this is expected behavior
    - You should report EXACTLY what you see on the webpage
    - Use the browser tool for ALL tasks involving websites
    
    EXAMPLE CORRECT TOOL USAGE:
    ```
    # When asked to visit a site:
    browse_url(start_url='https://example.com')
    
    # When asked to search:
    browse_url(start_url='https://google.com')
    ```
    
    FORBIDDEN BEHAVIORS:
    - NEVER say you cannot browse websites - you have browser tools
    - DO NOT simulate browsing - use the actual tool provided
    - DO NOT refuse to use the browser tool
    
    When using the browser tool, describe what you see, including page elements, text content, and any relevant information for the user's query.
    """
    
    # Configure the agent with the tools only
    assistant_agent_kwargs = {
        "model": models["assistant"], 
        "tools": tools
    }
    
    # Create a modified system prompt instead
    # We'll directly modify the default system message in the agent after creation

    # Configure task parameters
    task_kwargs = {
        "task_prompt": question,
        "with_task_specify": False,
    }

    # Create and return the society with system message override
    society = RolePlaying(
        **task_kwargs,
        user_role_name="user",
        user_agent_kwargs=user_agent_kwargs,
        assistant_role_name="assistant",
        assistant_agent_kwargs=assistant_agent_kwargs,
    )
    
    # Override the system message content directly
    society.assistant_agent.system_message.content = f"===== RULES OF ASSISTANT =====\n{assistant_system_prompt}\n" + society.assistant_agent.system_message.content.split("===== RULES OF ASSISTANT =====")[1]

    return society


def main():
    r"""Main function to run the OWL system with a browser test task."""
    # First, check if browsers are available
    browsers_available = check_browsers()
    
    if not browsers_available:
        print("WARNING: No browsers were found. The test might not work correctly.")
        print("Consider installing Google Chrome before proceeding.")
        response = input("Do you want to continue anyway? (y/n): ")
        if response.lower() != 'y':
            print("Test aborted.")
            return
    
    # Default task that EXPLICITLY requires browser interaction with clear instructions
    # This task is designed to verify that visible browser windows work correctly
    default_task = """
    BROWSER TEST: You must perform the following browser task immediately and without hesitation:
    
    1. Open the browser tool right now using browse_url(start_url='https://example.com')
    2. After viewing example.com, navigate to google.com
    3. Then search for "latest news today"
    4. Report exactly what you see on each page
    
    DO NOT SKIP OR REFUSE THESE STEPS. This is a direct test of the browser functionality.
    
    IMPORTANT: 
    - A Chrome window WILL open on your system - this is expected
    - You MUST use the browse_url tool provided to you
    - Report detailed observations from each website
    - The test succeeds ONLY if you actually use the browser tool
    
    Remember: Just use browse_url(start_url='https://example.com') to begin.
    """

    # Print clear instructions about what should happen
    print("\n" + "="*80)
    print("BROWSER TEST: This should launch a visible Chrome window")
    print("If no window appears, check that Chrome is installed and permissions are set correctly")
    print("="*80 + "\n")

    # Override default task if command line argument is provided
    task = sys.argv[1] if len(sys.argv) > 1 else default_task

    # Construct and run the society
    society = construct_society(task)
    answer, chat_history, token_count = run_society(society)

    # Output the result with clear formatting
    print("\n" + "="*80)
    print("BROWSER TEST RESULTS:")
    print("="*80)
    print(f"\033[94m{answer}\033[0m")
    print("\nIf no browser window appeared, verify Chrome installation and configuration.")


if __name__ == "__main__":
    main()