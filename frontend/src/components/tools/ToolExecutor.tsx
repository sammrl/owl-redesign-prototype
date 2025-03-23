import { useState } from 'react';
import { toolService, Tool } from '../../services/tools';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface ToolExecutorProps {
  tool: Tool;
  onExecutionComplete?: (result: any) => void;
}

export function ToolExecutor({ tool, onExecutionComplete }: ToolExecutorProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleParameterChange = (name: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Validate required parameters
      const missingParams = tool.parameters
        .filter(param => param.required && (parameters[param.name] === undefined || parameters[param.name] === ''))
        .map(param => param.name);
      
      if (missingParams.length > 0) {
        setError(`Missing required parameters: ${missingParams.join(', ')}`);
        return;
      }
      
      // Execute the tool
      const executionResult = await toolService.executeTool(tool.name, parameters);
      setResult(executionResult);
      
      if (onExecutionComplete) {
        onExecutionComplete(executionResult);
      }
    } catch (error: any) {
      setError(error.message || 'Error executing tool');
    } finally {
      setLoading(false);
    }
  };

  // Function to render appropriate input for parameter based on type
  const renderParameterInput = (param: Tool['parameters'][0]) => {
    const paramType = param.type.toLowerCase();
    const value = parameters[param.name] ?? param.default ?? '';
    
    // For string type
    if (paramType.includes('str') || paramType === 'any') {
      // If description suggests a long text, use textarea
      if (param.description?.toLowerCase().includes('text') && !param.name.toLowerCase().includes('url')) {
        return (
          <Textarea
            id={`param-${param.name}`}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleParameterChange(param.name, e.target.value)}
            placeholder={`Enter ${param.name}`}
            className="w-full"
          />
        );
      }
      
      return (
        <Input
          id={`param-${param.name}`}
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange(param.name, e.target.value)}
          placeholder={`Enter ${param.name}`}
          className="w-full"
        />
      );
    }
    
    // For number types (int, float)
    if (paramType.includes('int') || paramType.includes('float') || paramType.includes('number')) {
      return (
        <Input
          id={`param-${param.name}`}
          type="number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange(param.name, e.target.value ? Number(e.target.value) : '')}
          placeholder={`Enter ${param.name}`}
          className="w-full"
        />
      );
    }
    
    // For boolean type
    if (paramType.includes('bool')) {
      return (
        <div className="flex items-center space-x-2">
          <input
            id={`param-${param.name}`}
            type="checkbox"
            checked={!!value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange(param.name, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor={`param-${param.name}`} className="text-sm font-medium">
            {param.name}
          </label>
        </div>
      );
    }
    
    // Default to text input for other types
    return (
      <Input
        id={`param-${param.name}`}
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleParameterChange(param.name, e.target.value)}
        placeholder={`Enter ${param.name}`}
        className="w-full"
      />
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">{tool.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {tool.parameters.length === 0 ? (
          <p className="text-muted-foreground">This tool doesn't require any parameters.</p>
        ) : (
          <div className="space-y-4">
            {tool.parameters.map(param => (
              <div key={param.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`param-${param.name}`} className="text-sm font-medium">
                    {param.name}
                    {param.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <span className="text-xs text-muted-foreground">{param.type}</span>
                </div>
                {param.description && (
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                )}
                {renderParameterInput(param)}
              </div>
            ))}
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result !== null && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Result:</h3>
            <pre className="bg-muted p-3 rounded-md overflow-auto max-h-64 text-sm">
              {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
            </pre>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleExecute} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Executing...
            </>
          ) : (
            <>
              Execute {tool.name}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 