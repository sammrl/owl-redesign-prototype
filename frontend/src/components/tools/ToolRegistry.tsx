import { useState, useEffect } from 'react';
import { toolService, Tool } from '../../services/tools';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { useState as useStateAlias } from 'react'; // Dummy import to avoid missing import error

export function ToolRegistry() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  useEffect(() => {
    async function loadToolData() {
      setLoading(true);
      try {
        // Load categories
        const categoryList = await toolService.getCategories();
        setCategories(categoryList);
        
        // Load all tools
        const toolList = await toolService.getTools();
        setTools(toolList);
      } catch (error) {
        console.error('Error loading tool data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadToolData();
  }, []);
  
  const filteredTools = selectedCategory === 'all' 
    ? tools 
    : tools.filter(tool => tool.category === selectedCategory);
  
  const handleSelectTool = (tool: Tool) => {
    setSelectedTool(tool);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Tool Registry</h2>
        <Badge>
          {tools.length} Tools Available
        </Badge>
      </div>
      
      <Tabs defaultValue={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tools</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={selectedCategory} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map(tool => (
              <Card key={tool.name} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-md">{tool.name}</CardTitle>
                    <Badge variant="outline">{tool.category}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2 h-10">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-3 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {tool.parameters.length} parameter{tool.parameters.length !== 1 ? 's' : ''}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleSelectTool(tool)}>
                    Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      {selectedTool && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <div className="flex items-center">
                  {selectedTool.name}
                </div>
              </CardTitle>
              <Badge>{selectedTool.category}</Badge>
            </div>
            <CardDescription>{selectedTool.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-medium mb-2">Parameters:</h3>
            {selectedTool.parameters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parameters required</p>
            ) : (
              <div className="space-y-3">
                {selectedTool.parameters.map(param => (
                  <div key={param.name} className="bg-muted p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm">{param.name}</div>
                      <Badge variant="outline">{param.type}</Badge>
                    </div>
                    {param.description && (
                      <p className="text-sm mt-1 text-muted-foreground">{param.description}</p>
                    )}
                    <div className="flex items-center mt-1 text-xs">
                      {param.required ? (
                        <Badge variant="destructive" className="mr-2">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="mr-2">Optional</Badge>
                      )}
                      {param.default !== undefined && (
                        <span className="text-muted-foreground">
                          Default: <code>{JSON.stringify(param.default)}</code>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => setSelectedTool(null)}>
              Close Details
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 