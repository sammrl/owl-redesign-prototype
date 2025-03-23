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
from dotenv import load_dotenv

from camel.models import ModelFactory
from camel.toolkits import (
    SearchToolkit,
    BrowserToolkit,
    FileWriteToolkit,
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
        "planning": ModelFactory.create(
            model_platform=ModelPlatformType.OPENAI,
            model_type=ModelType.GPT_4O,
            model_config_dict={"temperature": 0},
        ),
    }

    # Configure toolkits
    tools = [
        *BrowserToolkit(
            headless=False,  # Set to True for headless mode (e.g., on remote servers)
            web_agent_model=models["browsing"],
            planning_agent_model=models["planning"],
        ).get_tools(),
        SearchToolkit().search_duckduckgo,
        SearchToolkit().search_wiki,
        *FileWriteToolkit(output_dir="./").get_tools(),
    ]

    # Configure agent roles and parameters
    user_agent_kwargs = {"model": models["user"]}
    
    # Enhanced prompt for assistant to use browser tools
    assistant_system_prompt = """You are a helpful assistant with access to browser tools. You MUST use these tools when answering questions.

    IMPORTANT TOOL USAGE INSTRUCTIONS:
    - ALWAYS use browse_url(start_url='https://website.com') to navigate to websites
    - DO NOT claim you cannot browse - you have browser tools available
    - Always use the actual browser tool instead of simulating browsing
    - When asked about any website or online information, use the browser tool
    
    When you use the browser tool:
    1. A Chrome window will appear (this is normal)
    2. You'll receive content from the actual webpage
    3. You should report what you actually see on the page
    4. Use multiple browser calls if needed to explore different pages
    
    You MUST use the browser tool for ANY web-related query, rather than relying on your training data.
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
    r"""Main function to run the OWL system with an example question."""
    # Default research question with stronger browser instructions
    default_task = """
    CRITICAL INSTRUCTION: You MUST use the browser tool to navigate to example.com right now.
    
    Please immediately use the browse_url tool to visit example.com and report what you see there.
    
    Required steps:
    1. Open the browser by calling browse_url(start_url='https://example.com')
    2. A Chrome window will appear (this is normal and expected)
    3. Report what you see on the website
    4. Then navigate to one more website of your choice and report what you see
    
    DO NOT SKIP THIS STEP. Immediately call browse_url(start_url='https://example.com') to begin.
    
    This is a direct test of the browser functionality - you must use the actual browse_url tool.
    """

    # Override default task if command line argument is provided
    task = sys.argv[1] if len(sys.argv) > 1 else default_task

    # Construct and run the society
    society = construct_society(task)
    answer, chat_history, token_count = run_society(society)

    # Output the result
    print(f"\033[94mAnswer: {answer}\033[0m")
    
    # Return info for testing
    return answer, chat_history, token_count


if __name__ == "__main__":
    main()
