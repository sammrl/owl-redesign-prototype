# OWL System Architecture Diagrams

## High-Level System Overview

```mermaid
graph TD
    User[User] -->|Inputs task| WebInterface[Web Interface]
    WebInterface -->|Processes request| SocietyConstruction[Society Construction]
    SocietyConstruction -->|Creates agents| AgentSociety[Agent Society]
    
    subgraph "Agent Society"
        UserAgent[User Agent]
        AssistantAgent[Assistant Agent]
        UserAgent <-->|Conversation| AssistantAgent
        AssistantAgent -->|Uses| ToolkitSystem[Toolkit System]
    end
    
    subgraph "Toolkit System"
        BrowserTools[Browser Toolkit]
        SearchTools[Search Toolkit]
        CodeTools[Code Execution Toolkit]
        DocumentTools[Document Processing Toolkit]
        VideoTools[Video Analysis Toolkit]
        ImageTools[Image Analysis Toolkit]
        OtherTools[Other Toolkits...]
    end
    
    AgentSociety -->|Generates| Answer[Final Answer]
    Answer -->|Displayed to| User
    
    SocietyConstruction -.->|Configures| ModelFactory[Model Factory]
    ModelFactory -.->|Creates models for| AgentSociety
    
    WebInterface -.->|Environment vars| EnvConfig[Environment Configuration]
    EnvConfig -.->|API keys| ModelFactory
```

## Conversation Flow Process

```mermaid
sequenceDiagram
    participant User
    participant WebInterface as Web Interface
    participant UserAgent as User Agent
    participant AssistantAgent as Assistant Agent
    participant Tools as Toolkits
    
    User->>WebInterface: Submit task
    WebInterface->>UserAgent: Initialize with task
    
    loop Conversation Rounds
        UserAgent->>AssistantAgent: Provide instruction
        AssistantAgent->>Tools: Select & execute appropriate tool
        Tools->>AssistantAgent: Return tool results
        AssistantAgent->>UserAgent: Respond with solution
        UserAgent->>UserAgent: Evaluate progress
    end
    
    UserAgent->>AssistantAgent: Send TASK_DONE signal
    AssistantAgent->>WebInterface: Generate final answer
    WebInterface->>User: Display result
```

## Tool Selection Process

```mermaid
flowchart TD
    Task[Task Description] --> AssistantAgent[Assistant Agent]
    AssistantAgent --> Analysis[Analyze Requirements]
    
    Analysis --> ToolSelect{Select Tool}
    ToolSelect -->|Web search needed| SearchTool[Search Toolkit]
    ToolSelect -->|Web browsing needed| BrowserTool[Browser Toolkit]
    ToolSelect -->|Code execution needed| CodeTool[Code Execution Toolkit]
    ToolSelect -->|Document processing needed| DocTool[Document Toolkit]
    ToolSelect -->|Image analysis needed| ImageTool[Image Analysis Toolkit]
    
    SearchTool & BrowserTool & CodeTool & DocTool & ImageTool --> Execute[Execute Tool]
    Execute --> Results[Process Results]
    Results --> NextStep{Next Step?}
    
    NextStep -->|More tools needed| ToolSelect
    NextStep -->|Task complete| FinalAnswer[Generate Answer]
```

## Society Construction Process

```mermaid
flowchart TD
    Entry[construct_society function] --> ConfigModels[Configure Models]
    ConfigModels --> CreateUserModel[Create User Agent Model]
    ConfigModels --> CreateAssistantModel[Create Assistant Agent Model]
    ConfigModels --> CreateSpecializedModels[Create Specialized Models]
    
    CreateUserModel & CreateAssistantModel & CreateSpecializedModels --> ConfigTools[Configure Toolkits]
    
    ConfigTools --> BrowserT[Browser Toolkit]
    ConfigTools --> SearchT[Search Toolkit]
    ConfigTools --> CodeT[Code Execution Toolkit]
    ConfigTools --> DocT[Document Processing Toolkit]
    ConfigTools --> OtherT[Other Toolkits...]
    
    BrowserT & SearchT & CodeT & DocT & OtherT --> AssignTools[Assign Tools to Assistant]
    
    AssignTools --> ConfigAgents[Configure Agent Parameters]
    ConfigAgents --> CreateSociety[Create Role-Playing Society]
    CreateSociety --> ReturnSociety[Return Society Object]
```

## Run Society Process

```mermaid
flowchart TD
    Entry[run_society function] --> InitChat[Initialize Chat]
    InitChat --> Conversation[Begin Conversation]
    
    subgraph "Conversation Loop"
        Conversation --> UserStep[Process User Step]
        UserStep --> CheckTaskDone{Task Done?}
        CheckTaskDone -->|No| AssistantStep[Process Assistant Step]
        AssistantStep --> RecordHistory[Record in Chat History]
        RecordHistory --> NextRound[Next Round]
        NextRound --> UserStep
    end
    
    CheckTaskDone -->|Yes| ExtractAnswer[Extract Final Answer]
    ExtractAnswer --> CalculateTokens[Calculate Token Usage]
    CalculateTokens --> ReturnResults[Return Answer, History & Tokens]
```

## API Server Architecture

```mermaid
flowchart TD
    Entry[main.py FastAPI application] --> SetupLogging[Setup Logging]
    SetupLogging --> ConfigMiddleware[Configure Middleware]
    ConfigMiddleware --> RegisterRouters[Register API Routers]
    
    subgraph "API Routers"
        ModulesRouter[Modules Router]
        EnvRouter[Environment Router]
        ChatRouter[Chat Router]
        LogsRouter[Logs Router]
    end
    
    RegisterRouters --> ModulesRouter & EnvRouter & ChatRouter & LogsRouter
    
    subgraph "Service Layer"
        ModuleManager[Module Manager]
        EnvManager[Environment Manager]
        OwlRunner[OWL Runner]
        LogManager[Log Manager]
        TaskRegistry[Task Registry]
    end
    
    ModulesRouter --> ModuleManager
    EnvRouter --> EnvManager
    ChatRouter --> OwlRunner
    LogsRouter --> LogManager
    OwlRunner -.->|Stores tasks| TaskRegistry
    
    subgraph "Communication Channels"
        RESTEndpoints[REST Endpoints]
        WebSocketEndpoint[WebSocket Endpoint]
    end
    
    ChatRouter --> RESTEndpoints & WebSocketEndpoint
    
    OwlRunner --> OWLCore[OWL Core Functionality]
    OWLCore --> BuildSociety[Build Society]
    BuildSociety --> RunSociety[Run Society]
    
    RESTEndpoints & WebSocketEndpoint --> ClientApp[Client Application]
    
    subgraph "API Endpoints"
        ModulesAPI[/modules/ GET]
        ModuleDetailsAPI[/modules/{name} GET]
        EnvListAPI[/env/list GET]
        EnvCheckAPI[/env/check GET]
        EnvSetAPI[/env/set POST]
        RunAsyncAPI[/run/async POST]
        TaskStatusAPI[/run/task/{id} GET]
        TasksListAPI[/run/tasks GET]
        LogsAPI[/logs GET]
        LogsFilesAPI[/logs/files GET]
        WebSocketAPI[/run/ws WebSocket]
    end
    
    ModulesRouter --> ModulesAPI & ModuleDetailsAPI
    EnvRouter --> EnvListAPI & EnvCheckAPI & EnvSetAPI
    ChatRouter --> RunAsyncAPI & TaskStatusAPI & TasksListAPI & WebSocketAPI
    LogsRouter --> LogsAPI & LogsFilesAPI
```

## Web Frontend Architecture 

```mermaid
flowchart TD
    Entry[App.tsx main component] --> RouterSetup[Setup React Router]
    RouterSetup --> ModuleContext[Initialize Module Context]
    ModuleContext --> RenderLayout[Render App Layout]
    
    subgraph "Main Tab Components"
        Conversation[Conversation Tab]
        Logs[Logs Tab]
        Settings[Settings Tab]
        Tools[Tools Tab]
        Tasks[Tasks Tab]
    end
    
    RenderLayout --> Conversation & Logs & Settings & Tools & Tasks
    
    subgraph "Conversation Components"
        ConversationPanel[Conversation Panel]
        SplitLeftPanel[Split Left Panel]
        SplitLeftPanel --> ConversationHistory[Conversation History]
        SplitLeftPanel --> ModuleSelector[Module Selector]
    end
    
    Conversation --> ConversationPanel & SplitLeftPanel
    
    subgraph "API Service Layer"
        ApiService[API Service]
        WebSocket[WebSocket Connection]
        RESTCalls[REST API Calls]
        
        subgraph "API Methods"
            RunQuery[runQuery]
            WebSocketQuery[sendWebSocketQuery]
            GetModules[getAvailableModules]
            GetEnvVars[getEnvironmentVariables]
            UpdateEnvVars[updateEnvVars]
            ListTasks[listTasks]
            GetLogs[getLogs]
            CancelTask[cancelTask]
        end
    end
    
    ApiService --> WebSocket & RESTCalls
    ApiService --> RunQuery & WebSocketQuery & GetModules & GetEnvVars & UpdateEnvVars & ListTasks & GetLogs & CancelTask
    
    ConversationPanel -->|Uses| RunQuery & WebSocketQuery
    ModuleSelector -->|Uses| GetModules
    Settings -->|Uses| GetEnvVars & UpdateEnvVars
    Logs -->|Uses| GetLogs
    Tasks -->|Uses| ListTasks & CancelTask
    
    WebSocket & RESTCalls --> ServerAPI[Server API]
    
    subgraph "API Endpoints"
        ModulesAPI[/api/modules]
        EnvAPI[/api/env]
        RunAPI[/api/run]
        LogsAPI[/api/logs]
        WsAPI[/api/run/ws]
    end
    
    ServerAPI --> ModulesAPI & EnvAPI & RunAPI & LogsAPI & WsAPI
```

## Environment Variable Management Process

```mermaid
flowchart TD
    Entry[Environment Management] --> LoadEnv[Load Environment Variables]
    
    LoadEnv --> SystemEnv[System Environment]
    LoadEnv --> EnvFile[.env File]
    LoadEnv --> FrontendEnv[Frontend Configuration]
    
    SystemEnv & EnvFile & FrontendEnv --> MergeEnv[Merge with Priority]
    MergeEnv --> FilterAPIKeys[Filter for API Keys]
    FilterAPIKeys --> DisplayTable[Display in UI Table]
    
    DisplayTable --> UserAction{User Action}
    UserAction -->|Add/Edit| AddEnvVar[Add Environment Variable]
    UserAction -->|Delete| DeleteEnvVar[Delete Environment Variable]
    UserAction -->|Save| SaveEnvVars[Save Environment Variables]
    
    AddEnvVar & DeleteEnvVar & SaveEnvVars --> UpdateEnvFile[Update .env File]
    UpdateEnvFile --> ReloadEnv[Reload Environment]
```

## OwlRolePlaying Class Structure

```mermaid
classDiagram
    class RolePlaying {
        +model
        +task_prompt
        +init_chat()
        +step()
        +astep()
    }
    
    class OwlRolePlaying {
        +user_role_name
        +assistant_role_name
        +output_language
        +user_agent_kwargs
        +assistant_agent_kwargs
        +_construct_gaia_sys_msgs()
        +_init_agents()
        +step()
        +astep()
    }
    
    class OwlGAIARolePlaying {
        +step()
    }
    
    RolePlaying <|-- OwlRolePlaying
    OwlRolePlaying <|-- OwlGAIARolePlaying
    
    class ChatAgent {
        +system_message
        +step()
        +astep()
    }
    
    OwlRolePlaying --> ChatAgent : uses
```