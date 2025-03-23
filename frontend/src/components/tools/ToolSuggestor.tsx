import { useState } from 'react';
import { toolService, ToolSuggestion, Tool } from '../../services/tools';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface ToolSuggestorProps {
  onSelectTool?: (tool: Tool) => void;
  context?: any[];
}

export function ToolSuggestor({ onSelectTool, context }: ToolSuggestorProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const results = await toolService.suggestTools(query, context);
      setSuggestions(results);
    } catch (error) {
      console.error('Error getting tool suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToolSelect = async (suggestion: ToolSuggestion) => {
    try {
      const toolInfo = await toolService.getToolInfo(suggestion.name);
      if (toolInfo && onSelectTool) {
        setSelectedTool(toolInfo);
        onSelectTool(toolInfo);
      }
    } catch (error) {
      console.error('Error loading tool details:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="What do you want to do?"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? (
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
          ) : (
            <span>Find Tools</span>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Suggested Tools:</h3>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.name} className="p-3 hover:bg-accent transition-colors cursor-pointer" onClick={() => handleToolSelect(suggestion)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">{suggestion.name}</span>
                      <Badge className="ml-2" variant="outline">{suggestion.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                    {suggestion.reasoning && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{suggestion.reasoning}</p>
                    )}
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="mr-1">{Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 