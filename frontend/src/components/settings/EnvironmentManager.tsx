import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { owlApiService } from '../../services/api';
import { Plus, X, Trash2, ExternalLink, KeySquare, Save, FileText, Upload, Eye, EyeOff, Info } from 'lucide-react';

interface EnvVar {
  key: string;
  value: string;
  guide?: string;
  defaultValue?: string;
  description?: string;
  group: string;
  isOptional?: boolean;
}

// Predefined environment variables with descriptions and guide links
const PREDEFINED_ENV_VARS: EnvVar[] = [
  // OpenAI API Variables
  { 
    key: 'OPENAI_API_KEY', 
    guide: 'https://platform.openai.com/api-keys',
    description: 'Required for OpenAI models (GPT-3.5, GPT-4)',
    defaultValue: '',
    group: 'openai',
    value: ''
  },
  { 
    key: 'OPENAI_API_BASE_URL', 
    guide: 'https://platform.openai.com/docs/api-reference',
    description: 'OpenAI API endpoint (default: https://api.openai.com, for Groq use https://api.groq.com/openai/v1)',
    defaultValue: 'https://api.openai.com',
    group: 'openai',
    value: ''
  },
  
  // Groq API Variables
  { 
    key: 'GROQ_API_KEY', 
    guide: 'https://console.groq.com/keys',
    description: 'Required for Groq models. When using Groq, set OPENAI_API_BASE_URL to https://api.groq.com/openai/v1',
    defaultValue: '',
    group: 'groq',
    isOptional: true,
    value: ''
  },
  
  // Azure OpenAI API Variables
  { 
    key: 'AZURE_OPENAI_API_KEY', 
    guide: 'https://portal.azure.com/',
    description: 'Required for Azure OpenAI integration',
    defaultValue: '',
    group: 'azure',
    isOptional: true,
    value: ''
  },
  { 
    key: 'AZURE_OPENAI_BASE_URL', 
    guide: 'https://portal.azure.com/',
    description: 'Azure OpenAI endpoint URL',
    defaultValue: 'https://{your-resource-name}.openai.azure.com',
    group: 'azure',
    isOptional: true,
    value: ''
  },
  { 
    key: 'AZURE_API_VERSION', 
    guide: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/reference',
    description: 'Azure OpenAI API version (e.g., 2023-05-15)',
    defaultValue: '2023-05-15',
    group: 'azure',
    isOptional: true,
    value: ''
  },
  { 
    key: 'AZURE_DEPLOYMENT_NAME', 
    guide: 'https://portal.azure.com/',
    description: 'Azure OpenAI deployment name',
    defaultValue: '',
    group: 'azure',
    isOptional: true,
    value: ''
  },
  
  // Anthropic API Variables
  {
    key: 'ANTHROPIC_API_KEY',
    guide: 'https://console.anthropic.com/settings/keys',
    description: 'Required for Claude models from Anthropic',
    defaultValue: '',
    group: 'anthropic',
    isOptional: true,
    value: ''
  },
  {
    key: 'ANTHROPIC_API_URL',
    guide: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
    description: 'Anthropic API endpoint (default: https://api.anthropic.com)',
    defaultValue: 'https://api.anthropic.com',
    group: 'anthropic',
    isOptional: true,
    value: ''
  },
  
  // Qwen API Variables
  { 
    key: 'QWEN_API_KEY', 
    guide: 'https://help.aliyun.com/zh/model-studio/developer-reference/get-api-key',
    description: 'Required for Qwen models',
    defaultValue: '',
    group: 'qwen',
    isOptional: true,
    value: ''
  },
  
  // DeepSeek API Variables
  { 
    key: 'DEEPSEEK_API_KEY', 
    guide: 'https://platform.deepseek.com/api_keys',
    description: 'Required for DeepSeek models',
    defaultValue: '',
    group: 'deepseek',
    value: ''
  },
  
  // Google Search API Variables
  { 
    key: 'GOOGLE_API_KEY', 
    guide: 'https://console.cloud.google.com/apis/credentials',
    description: 'Required for Google Search integration (works with SEARCH_ENGINE_ID)',
    defaultValue: '',
    group: 'google',
    value: ''
  },
  { 
    key: 'SEARCH_ENGINE_ID', 
    guide: 'https://programmablesearchengine.google.com/controlpanel/all',
    description: 'Required for Google Search integration (works with GOOGLE_API_KEY)',
    defaultValue: '',
    group: 'google',
    value: ''
  },
  
  // Chunkr API Variables
  { 
    key: 'CHUNKR_API_KEY', 
    guide: 'https://chunkr.ai/',
    description: 'Required for Chunkr document processing',
    defaultValue: '',
    group: 'chunkr',
    value: ''
  },
  
  // Firecrawl API Variables
  { 
    key: 'FIRECRAWL_API_KEY', 
    guide: 'https://www.firecrawl.dev/',
    description: 'Required for Firecrawl web scraping',
    defaultValue: '',
    group: 'firecrawl',
    value: ''
  },
  { 
    key: 'FIRECRAWL_API_URL', 
    guide: 'https://www.firecrawl.dev/',
    description: 'Firecrawl API endpoint (default: https://api.firecrawl.dev)',
    defaultValue: 'https://api.firecrawl.dev',
    group: 'firecrawl',
    value: ''
  },
  
  // HuggingFace API Variables
  {
    key: 'HUGGINGFACE_API_KEY',
    guide: 'https://huggingface.co/settings/tokens',
    description: 'Required for HuggingFace models and endpoints',
    defaultValue: '',
    group: 'huggingface',
    isOptional: true,
    value: ''
  },
  {
    key: 'HUGGINGFACE_API_URL',
    guide: 'https://huggingface.co/docs/api-inference/index',
    description: 'HuggingFace API endpoint (default: https://api-inference.huggingface.co)',
    defaultValue: 'https://api-inference.huggingface.co',
    group: 'huggingface',
    isOptional: true,
    value: ''
  },
  
  // NVIDIA API Variables
  {
    key: 'NVIDIA_API_KEY',
    guide: 'https://console.api.nvidia.com/',
    description: 'Required for NVIDIA AI Foundation models',
    defaultValue: '',
    group: 'nvidia',
    isOptional: true,
    value: ''
  },
  
  // OWL Configuration Variables
  {
    key: 'OWL_PORT',
    description: 'Port for the OWL backend server',
    defaultValue: '7860',
    group: 'owl',
    isOptional: true,
    value: ''
  },
  {
    key: 'OWL_HOST',
    description: 'Host binding for the OWL backend server',
    defaultValue: '0.0.0.0',
    group: 'owl',
    isOptional: true,
    value: ''
  },
  {
    key: 'OWL_DEBUG',
    description: 'Enable debug mode for the OWL backend',
    defaultValue: 'false',
    group: 'owl',
    isOptional: true,
    value: ''
  },
  
  // Model Configuration
  {
    key: 'DEFAULT_MODEL',
    description: 'Default model to use for the OWL system',
    defaultValue: 'gpt-4',
    group: 'model',
    isOptional: true,
    value: ''
  },
  {
    key: 'MODEL_TEMPERATURE',
    description: 'Temperature setting for model responses (0.0-1.0)',
    defaultValue: '0.7',
    group: 'model',
    isOptional: true,
    value: ''
  },
  {
    key: 'MAX_TOKENS',
    description: 'Maximum number of tokens for model responses',
    defaultValue: '4096',
    group: 'model',
    isOptional: true,
    value: ''
  },
  {
    key: 'CONTEXT_WINDOW',
    description: 'Size of context window for chat history',
    defaultValue: '8192',
    group: 'model',
    isOptional: true,
    value: ''
  }
];

// Define groups for better organization
const GROUPS = [
  { id: 'openai', name: 'OpenAI', icon: '🤖', description: 'OpenAI API configuration' },
  { id: 'groq', name: 'Groq', icon: '⚡', description: 'Groq API configuration' },
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', description: 'Anthropic Claude API configuration' },
  { id: 'azure', name: 'Azure OpenAI', icon: '☁️', description: 'Microsoft Azure OpenAI configuration' },
  { id: 'qwen', name: 'Qwen', icon: '🔍', description: 'Alibaba Qwen model configuration' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔎', description: 'DeepSeek model configuration' },
  { id: 'huggingface', name: 'HuggingFace', icon: '🤗', description: 'HuggingFace API configuration' },
  { id: 'nvidia', name: 'NVIDIA', icon: '🟢', description: 'NVIDIA AI Foundation API configuration' },
  { id: 'google', name: 'Google Search', icon: '🔍', description: 'Google Search API with API key and Search Engine ID' },
  { id: 'chunkr', name: 'Chunkr', icon: '📄', description: 'Chunkr document processing API' },
  { id: 'firecrawl', name: 'Firecrawl', icon: '🔥', description: 'Firecrawl web scraping API' },
  { id: 'owl', name: 'OWL System', icon: '🦉', description: 'OWL system configuration' },
  { id: 'model', name: 'Model Settings', icon: '🧠', description: 'General model configuration' },
  { id: 'other', name: 'Other', icon: '🔧', description: 'Other configuration variables' }
];

export function EnvironmentManager() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkEnvText, setBulkEnvText] = useState('');
  const [visibleValues, setVisibleValues] = useState<{[key: string]: boolean}>({});
  const [showAllFields, setShowAllFields] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{[key: string]: {status: string, message: string}}>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Toggle password visibility
  const toggleValueVisibility = (key: string) => {
    setVisibleValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Clear API key errors
  const clearApiKeyErrors = () => {
    setApiKeyStatus({});
  };

  // Fetch environment variables on component mount
  useEffect(() => {
    fetchEnvironmentVariables();
  }, []);

  const fetchEnvironmentVariables = async () => {
    try {
      setIsLoading(true);
      clearApiKeyErrors();
      // Call backend API to get environment variables
      const envData = await owlApiService.getEnvironmentVariables();
      
      // Convert array to map for easier access
      const envMap: Record<string, string> = {};
      envData.forEach((env: {key: string, value: string}) => {
        envMap[env.key] = env.value;
      });
      
      // Create a complete list with all predefined variables
      const completeVars: EnvVar[] = PREDEFINED_ENV_VARS.map(predefined => {
        return {
          key: predefined.key,
          value: envMap[predefined.key] || predefined.defaultValue || '',
          guide: predefined.guide,
          description: predefined.description,
          defaultValue: predefined.defaultValue,
          group: predefined.group,
          isOptional: predefined.isOptional
        };
      });
      
      // Add any custom variables that aren't in the predefined list
      envData.forEach((env: {key: string, value: string}) => {
        if (!PREDEFINED_ENV_VARS.some(p => p.key === env.key)) {
          completeVars.push({
            ...env,
            group: 'other'
          });
        }
      });
      
      setEnvVars(completeVars);
    } catch (error) {
      console.error('Failed to fetch environment variables:', error);
      setStatusMessage('Failed to load environment variables');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);
      clearApiKeyErrors();
      
      // Only save non-empty variables
      const nonEmptyVars = envVars.filter(v => v.value.trim() !== '');
      
      // Format data for API
      const updatedVars = nonEmptyVars.map(({ key, value }) => ({ key, value }));
      
      // Call API to update environment variables
      await owlApiService.updateEnvVars(updatedVars);
      setStatusMessage('Environment variables saved successfully');
      
      // Refresh the list
      await fetchEnvironmentVariables();
    } catch (error) {
      console.error('Failed to save environment variables:', error);
      setStatusMessage('Failed to save environment variables');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateVariable = (index: number, field: 'key' | 'value', newValue: string) => {
    const updatedVars = [...envVars];
    
    // If updating a key, remove any equals sign if pasted with it
    if (field === 'key' && newValue.includes('=')) {
      newValue = newValue.split('=')[0].trim();
    }
    
    // If updating a value, strip quotes if present
    if (field === 'value') {
      let processedValue = newValue.trim();
      if ((processedValue.startsWith('"') && processedValue.endsWith('"')) || 
          (processedValue.startsWith("'") && processedValue.endsWith("'"))) {
        processedValue = processedValue.substring(1, processedValue.length - 1);
        newValue = processedValue;
      }
      
      // We're removing the automatic validation for OpenAI API keys
      // as it caused false positives with sk-proj keys
    }
    
    updatedVars[index][field] = newValue;
    setEnvVars(updatedVars);
  };

  // Parse bulk environment text into key-value pairs
  const handleBulkImport = async () => {
    if (!bulkEnvText.trim()) {
      setStatusMessage('No environment variables to import');
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting bulk import process");
      
      // Parse the bulk text into key-value pairs
      const lines = bulkEnvText.split('\n');
      console.log(`Processing ${lines.length} lines of environment variables`);
      
      const newVars: EnvVar[] = [];
      const skippedLines: string[] = [];
      let hasError = false;
      
      // Common placeholder patterns to ignore
      const placeholderPatterns = [
        /paste.*key/i,            // "paste key here", "paste your key"
        /your.*key/i,             // "your api key", "insert your key"
        /api key here/i,          // "api key here"
        /example/i,               // "example key"
        /xxxx|yyyy/i,             // placeholder pattern with xxxx or yyyy
        /insert|replace/i,        // "insert key", "replace with key"
        /sk-demo|sk-placeholder/i,// Common placeholder prefixes used in documentation
        /^http(s)?:\/\//i,        // URLs (they may have equals signs but aren't keys)
        /\[.*\]/i,                // Text in brackets like [YOUR_API_KEY]
        /\<.*\>/i,                // Text in angle brackets like <YOUR_API_KEY>
      ];
      
      // Check if a string matches a placeholder pattern
      const isPlaceholder = (value: string): boolean => {
        // Short strings without enough complexity are likely placeholders
        if (value.length < 8) return true;
        
        // Check against placeholder patterns
        return placeholderPatterns.some(pattern => pattern.test(value));
      };
      
      lines.forEach(line => {
        // Skip empty lines or comments
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        
        // Improved parsing - find first equals sign, handle values that may contain equals signs
        const firstEqualsIndex = line.indexOf('=');
        if (firstEqualsIndex === -1) {
          skippedLines.push(`Invalid format (no equals sign): ${line}`);
          return;
        }
        
        const key = line.substring(0, firstEqualsIndex).trim();
        let value = line.substring(firstEqualsIndex + 1).trim();
        
        // Skip empty keys
        if (!key) {
          skippedLines.push(`Empty key: ${line}`);
          return;
        }
        
        // Process the value - remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        // Skip placeholder values
        if (isPlaceholder(value)) {
          skippedLines.push(`Skipped placeholder value: ${key}`);
          return;
        }
        
        // Find predefined variable for guide URL and group
        const predefined = PREDEFINED_ENV_VARS.find(v => v.key === key);
        
        newVars.push({
          key,
          value,
          guide: predefined?.guide,
          group: predefined?.group || 'other'
        });
      });
      
      if (newVars.length === 0) {
        setStatusMessage(`No valid environment variables found. ${skippedLines.length} lines skipped.`);
        setIsLoading(false);
        return;
      }
      
      // Update existing variables with new values
      const updatedVars = [...envVars];
      newVars.forEach(newVar => {
        const existingIndex = updatedVars.findIndex(v => v.key === newVar.key);
        if (existingIndex >= 0) {
          updatedVars[existingIndex].value = newVar.value;
        } else {
          updatedVars.push(newVar);
        }
      });
      
      // Update the backend
      try {
        await owlApiService.updateEnvVars(updatedVars.map(({ key, value }) => ({ key, value })));
        
        // Refresh the list to ensure consistency
        await fetchEnvironmentVariables();
        
        setStatusMessage(`Successfully imported ${newVars.length} environment variables. ${skippedLines.length > 0 ? `${skippedLines.length} lines skipped.` : ''}`);
      } catch (error) {
        console.error('Failed to update backend:', error);
        setStatusMessage(`Variables parsed but failed to update backend: ${error}`);
        hasError = true;
      }
      
      // Reset the text field and hide the form only if successful
      if (!hasError) {
        setBulkEnvText('');
        setShowBulkImport(false);
      }
      
      // Log skipped lines for debugging
      if (skippedLines.length > 0) {
        console.log('Skipped lines:', skippedLines);
      }
    } catch (error) {
      console.error('Error in bulk import:', error);
      setStatusMessage(`Error processing environment variables: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Group environment variables by their group
  const groupedVars = GROUPS.map(group => {
    const vars = envVars.filter(v => v.group === group.id);
    return {
      ...group,
      variables: vars
    };
  }).filter(group => group.variables.length > 0);

  // Filter visible variables based on settings
  const getVisibleVars = (vars: EnvVar[]) => {
    if (showAllFields) {
      return showOptionalFields ? vars : vars.filter(v => !v.isOptional);
    }
    return showOptionalFields 
      ? vars.filter(v => v.value !== '' || !v.isOptional)
      : vars.filter(v => v.value !== '' && !v.isOptional);
  };

  // Test API key connection
  const testApiKey = async (keyName: string, value: string) => {
    if (!value || !keyName) {
      setApiKeyStatus({
        ...apiKeyStatus,
        [keyName]: {
          status: 'error',
          message: 'API key is empty'
        }
      });
      return;
    }

    setTestingKey(keyName);
    
    try {
      if (keyName === 'OPENAI_API_KEY') {
        const result = await owlApiService.testOpenAIConnection();
        
        if (result.status === 'success') {
          setApiKeyStatus({
            ...apiKeyStatus,
            [keyName]: {
              status: 'success',
              message: 'Connection successful!'
            }
          });
        } else {
          // Parse error details if available
          let errorDetail = '';
          try {
            if (result.details) {
              const errorObj = JSON.parse(result.details);
              errorDetail = errorObj.error?.message || '';
            }
          } catch (e) {
            errorDetail = result.details || '';
          }
          
          setApiKeyStatus({
            ...apiKeyStatus,
            [keyName]: {
              status: 'error',
              message: errorDetail || result.message || 'Connection failed'
            }
          });
        }
      }
    } catch (error: any) {
      setApiKeyStatus({
        ...apiKeyStatus,
        [keyName]: {
          status: 'error',
          message: error.message || 'Connection test failed'
        }
      });
    } finally {
      setTestingKey(null);
    }
  };

  return (
    <div className="premium-card rounded-xl border border-border/20 bg-gradient-to-br from-background to-background/80 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <KeySquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-medium tracking-tight">API Keys & Environment</h2>
            <p className="text-sm text-muted-foreground">
              Configure API keys and service credentials
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAllFields(!showAllFields)}
            className="premium-button-subtle inline-flex items-center gap-1 rounded border border-border/20 bg-muted/20 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <Info className="h-3 w-3" />
            {showAllFields ? 'Show Configured Fields' : 'Show All Fields'}
          </button>
          <button
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="premium-button-subtle inline-flex items-center gap-1 rounded border border-border/20 bg-muted/20 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <Info className="h-3 w-3" />
            {showOptionalFields ? 'Hide Optional Fields' : 'Show Optional Fields'}
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="premium-button-subtle inline-flex items-center gap-1 rounded border border-border/20 bg-muted/20 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
          >
            <FileText className="h-3 w-3" />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary"
        >
          {statusMessage}
        </motion.div>
      )}

      {/* Bulk Import Form */}
      {showBulkImport && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4 rounded-lg border border-border/10 bg-muted/5 p-4"
        >
          <div className="mb-2 flex justify-between">
            <h3 className="text-sm font-medium">Bulk Import Environment Variables</h3>
            <button 
              onClick={() => setShowBulkImport(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="mb-2">
            <p className="text-xs text-muted-foreground">
              Paste your environment variables below in KEY=VALUE format (one per line, just like a .env file)
            </p>
          </div>
          
          <textarea
            value={bulkEnvText}
            onChange={(e) => setBulkEnvText(e.target.value)}
            placeholder="OPENAI_API_KEY=sk-xxxx\nDEEPSEEK_API_KEY=sk-xxxx"
            className="premium-input mb-4 h-32 w-full rounded border border-border/10 bg-background/50 p-3 font-mono text-sm"
          />
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setBulkEnvText('');
                setShowBulkImport(false);
              }}
              className="inline-flex items-center gap-1 rounded border border-border/20 bg-muted/20 px-3 py-1 text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkImport}
              disabled={!bulkEnvText.trim()}
              className="premium-button inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            >
              <Upload className="h-3 w-3" />
              Import Variables
            </button>
          </div>
        </motion.div>
      )}

      {/* Environment Variables By Provider/Function */}
      <div className="space-y-6">
        {groupedVars.map(group => {
          const visibleVars = getVisibleVars(group.variables);
          
          if (visibleVars.length === 0) return null;
          
          return (
            <div key={group.id} className="rounded-lg border border-border/10 overflow-hidden">
              <div className="bg-muted/20 px-4 py-2 border-b border-border/10">
                <h3 className="font-medium flex items-center gap-2">
                  <span>{group.icon}</span>
                  {group.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <div className="p-4 space-y-4">
                {visibleVars.map((env) => {
                  const varIndex = envVars.findIndex(v => v.key === env.key);
                  const isSecretKey = env.key.includes('KEY') && !env.key.includes('URL');
                  
                  return (
                    <div key={env.key} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,2fr]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          {env.key}
                          {env.isOptional && (
                            <span className="ml-1 text-xs text-muted-foreground/50">(optional)</span>
                          )}
                          {env.guide && (
                            <a
                              href={env.guide}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 inline-flex items-center text-muted-foreground hover:text-primary"
                              title="Documentation"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </label>
                        {env.description && (
                          <p className="text-xs text-muted-foreground/70">{env.description}</p>
                        )}
                      </div>
                      
                      {isSecretKey ? (
                        <div className="relative">
                          <input
                            type={visibleValues[env.key] ? "text" : "password"}
                            value={env.value}
                            onChange={(e) => handleUpdateVariable(varIndex, 'value', e.target.value)}
                            placeholder={`Enter ${env.key}`}
                            className="premium-input w-full rounded border border-border/20 bg-background px-3 py-1.5 pr-9 text-sm shadow-sm focus:border-blue-400/30 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 transform flex gap-1">
                            {env.key === 'OPENAI_API_KEY' && env.value && (
                              <button
                                type="button"
                                onClick={() => testApiKey(env.key, env.value)}
                                disabled={testingKey === env.key}
                                title="Test API Key"
                                className="text-muted-foreground hover:text-primary text-xs opacity-60"
                              >
                                {testingKey === env.key ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                                ) : (
                                  <span>Test</span>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleValueVisibility(env.key)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {visibleValues[env.key] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {apiKeyStatus[env.key] && (
                            <div className="mt-1 px-2 py-1 text-xs">
                              {apiKeyStatus[env.key].message}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={env.value}
                          onChange={(e) => handleUpdateVariable(varIndex, 'value', e.target.value)}
                          placeholder={env.defaultValue || `Enter ${env.key}`}
                          className="premium-input w-full rounded border border-border/20 bg-background px-3 py-1.5 text-sm shadow-sm focus:border-blue-400/30 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Custom Variable Section */}
        <div className="rounded-lg border border-border/10 overflow-hidden">
          <div className="bg-muted/20 px-4 py-2 border-b border-border/10 flex justify-between items-center">
            <h3 className="font-medium">Custom Variables</h3>
            <button
              onClick={() => {
                const newVar = { key: '', value: '', guide: '', group: 'other' };
                setEnvVars([...envVars, newVar]);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              Add Custom Variable
            </button>
          </div>
          <div className="p-4 space-y-4">
            {envVars.filter(v => v.group === 'other' && v.key !== '').map((env, index) => {
              const varIndex = envVars.findIndex(v => v.key === env.key);
              const isSecretKey = env.key.toLowerCase().includes('key') || 
                                 env.key.toLowerCase().includes('secret') ||
                                 env.key.toLowerCase().includes('password');
              
              return (
                <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,2fr,auto]">
                  <input
                    type="text"
                    value={env.key}
                    onChange={(e) => handleUpdateVariable(varIndex, 'key', e.target.value)}
                    placeholder="Variable Name"
                    className="premium-input w-full rounded border border-border/20 bg-background px-3 py-1.5 text-sm shadow-sm focus:border-blue-400/30 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                  />
                  <div className="relative">
                    <input
                      type={isSecretKey && !visibleValues[env.key] ? "password" : "text"}
                      value={env.value}
                      onChange={(e) => handleUpdateVariable(varIndex, 'value', e.target.value)}
                      placeholder="Value"
                      className="premium-input w-full rounded border border-border/20 bg-background px-3 py-1.5 pr-9 text-sm shadow-sm focus:border-blue-400/30 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                    />
                    {isSecretKey && (
                      <button
                        type="button"
                        onClick={() => toggleValueVisibility(env.key)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 transform text-muted-foreground hover:text-foreground"
                      >
                        {visibleValues[env.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const updatedVars = [...envVars];
                      updatedVars.splice(varIndex, 1);
                      setEnvVars(updatedVars);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {envVars.filter(v => v.group === 'other' && v.key !== '').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No custom variables. Click "Add Custom Variable" to create one.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSaveChanges}
          disabled={isLoading}
          className="premium-button inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
} 