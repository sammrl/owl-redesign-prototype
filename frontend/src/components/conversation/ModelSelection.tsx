import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ModelSelectionProps {
  onModelSelect?: (moduleName: string) => void;
  defaultSelectedId?: string;
}

const ModelSelection: React.FC<ModelSelectionProps> = ({ 
  onModelSelect, 
  defaultSelectedId = null 
}) => {
  const [selectedModel, setSelectedModel] = useState<string | null>(defaultSelectedId);
  const models = [
    { id: '1', name: 'Mini Mode', description: 'Using OpenAI model with minimal configuration to process tasks', module: 'run_mini' },
    { id: '2', name: 'Deepseek Chinese', description: 'Using deepseek model to process Chinese tasks', module: 'run_deepseek_zh' },
    { id: '3', name: 'OpenAI Compatible', description: 'Using openai compatible model to process tasks', module: 'run_openai_compatiable_model' },
    { id: '4', name: 'Ollama', description: 'Using local ollama model to process tasks', module: 'run_ollama' },
    { id: '5', name: 'Browser Automation', description: 'Web browser automation using Playwright for tasks like searching, extracting content and screenshots', module: 'browser_example' },
  ];

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    
    if (onModelSelect) {
      const selectedModelData = models.find(model => model.id === modelId);
      if (selectedModelData) {
        onModelSelect(selectedModelData.module);
      }
    }
  };

  // Notify parent of default selection on component mount
  useEffect(() => {
    if (defaultSelectedId && onModelSelect) {
      const defaultModel = models.find(model => model.id === defaultSelectedId);
      if (defaultModel) {
        onModelSelect(defaultModel.module);
      }
    }
  }, [defaultSelectedId, onModelSelect]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Select Module</h3>
        <p className="text-xs text-muted-foreground/70">Choose how your request will be processed</p>
      </div>
      
      <div className="module-selector-container">
        {models.map((model) => (
          <div 
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className={cn(
              "mb-2 p-3 rounded-md border transition-all duration-200 cursor-pointer",
              selectedModel === model.id 
                ? "border-primary/50 bg-primary/5 shadow-sm" 
                : "border-border hover:border-primary/30 hover:bg-accent/50"
            )}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <h4 className="text-xs font-medium mb-0.5 text-primary-foreground">{model.name}</h4>
                <p className="text-xs text-muted-foreground/90">{model.description}</p>
              </div>
              {selectedModel === model.id && (
                <div className="h-2 w-2 rounded-full bg-primary"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelSelection; 