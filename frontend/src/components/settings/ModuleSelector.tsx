import { /* useState, useEffect */ } from "react";
import { motion } from "framer-motion";
import { useModule } from "../../App";
import { Box, Zap } from "lucide-react";

const modules = [
  {
    id: "run",
    name: "Default",
    description: "Using OpenAI model's default agent collaboration mode, suitable for most tasks."
  },
  {
    id: "run_mini",
    name: "Mini Mode",
    description: "Using OpenAI model with minimal configuration to process tasks"
  },
  {
    id: "run_deepseek_zh",
    name: "Deepseek Chinese",
    description: "Using deepseek model to process Chinese tasks"
  },
  {
    id: "run_openai_compatiable_model",
    name: "OpenAI Compatible",
    description: "Using openai compatible model to process tasks"
  },
  {
    id: "run_ollama",
    name: "Ollama",
    description: "Using local ollama model to process tasks"
  },
  {
    id: "run_qwen_mini_zh",
    name: "Qwen Mini",
    description: "Using qwen model with minimal configuration to process tasks"
  },
  {
    id: "run_qwen_zh",
    name: "Qwen",
    description: "Using qwen model to process tasks"
  },
  {
    id: "run_test_hybrid",
    name: "Hybrid Test System",
    description: "Test mode for the enhanced hybrid agent system with loop detection and OpenRouter integration"
  }
];

interface ModuleSelectorProps {
  onSelectModule?: (moduleId: string) => void;
}

export function ModuleSelector({ onSelectModule }: ModuleSelectorProps) {
  const { selectedModule, setSelectedModule } = useModule();

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    if (onSelectModule) {
      onSelectModule(moduleId);
    }
  };

  return (
    <div className="premium-card w-full h-full overflow-hidden rounded-xl border border-border/20 bg-gradient-to-br from-background to-background/80 shadow-xl backdrop-blur-sm p-3 flex flex-col">
      <div className="mb-2 flex items-center gap-2 flex-shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Box className="h-3 w-3 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-medium tracking-tight">Select Module</h2>
          <p className="text-xs text-muted-foreground">Choose how your request will be processed</p>
        </div>
      </div>
      
      <div className="custom-scrollbar flex-grow overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-1">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              isSelected={selectedModule === module.id}
              onSelect={handleModuleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ModuleCardProps {
  module: typeof modules[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function ModuleCard({ module, isSelected, onSelect }: ModuleCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(module.id)}
      className={`
        relative cursor-pointer overflow-hidden rounded-lg border p-2
        transition-all duration-200 ease-in-out
        ${isSelected 
          ? "premium-module-selected border-primary/40 bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary),0.2),0_2px_4px_rgba(var(--primary),0.1)]" 
          : "border-border/40 hover:border-primary/30 hover:bg-muted/30"}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-medium">{module.name}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{module.description}</p>
        </div>
        
        {isSelected && (
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Zap className="h-2.5 w-2.5 text-primary" />
          </div>
        )}
      </div>
      
      {isSelected && (
        <motion.div
          layoutId="moduleHighlight"
          className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-primary/80 via-primary to-primary/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
} 