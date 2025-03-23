import { useState, useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { ConversationPanel } from './components/conversation/ConversationPanel'
import { SplitLeftPanel } from './components/conversation/SplitLeftPanel'
import { ModuleSelector } from './components/settings/ModuleSelector'
import { LogsDisplay } from './components/logs/LogsDisplay'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Settings, MessageSquare, Layers, AlertCircle } from 'lucide-react'
import { owlApiService } from './services/api'
import { EnvironmentManager } from './components/settings/EnvironmentManager'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Alert, AlertTitle, AlertDescription } from './components/ui/alert'

// Create a context for module selection
import { createContext, useContext } from 'react';

interface ModuleContextType {
  selectedModule: string;
  setSelectedModule: (moduleId: string) => void;
}

export const ModuleContext = createContext<ModuleContextType | null>(null);

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
}


function App() {
  const [selectedModule, setSelectedModule] = useState('run')
  const [loaded, setLoaded] = useState(false)
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  
  // Extract the current tab from the URL path
  const currentTab = location.pathname.split('/')[1] || 'conversation'

  useEffect(() => {
    // Simulate an elegant loading sequence
    const timer = setTimeout(() => {
      setLoaded(true);
      checkBackendConnection();
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Check backend connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      await checkBackendConnection();
    };
    
    // Check connection every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const checkBackendConnection = async () => {
    try {
      const isConnected = await owlApiService.checkConnection();
      setBackendConnected(isConnected);
    } catch (error) {
      console.error("Error checking backend connection:", error);
      setBackendConnected(false);
    }
  };

  // Animation variants for premium feel
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    console.log(`Selected module: ${moduleId}`);
  };

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  return (
    <ModuleContext.Provider value={{ selectedModule, setSelectedModule: handleModuleSelect }}>
      <AppLayout>
        <AnimatePresence mode="wait">
          {loaded && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="py-4"
            >
              {backendConnected === false && (
                <motion.div 
                  variants={itemVariants}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>
                      Cannot connect to the OWL API backend. Please make sure it's running at the configured URL.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              <motion.div 
                variants={itemVariants}
                className="premium-card mb-8 overflow-hidden rounded-xl"
              >
                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                  <div className="border-b border-border/10 bg-gradient-to-r from-background/80 to-background px-1 backdrop-blur-sm">
                    <TabsList className="premium-tabs-list h-14 bg-transparent p-0">
                      <TabsTrigger 
                        value="conversation" 
                        className="premium-tab flex h-full items-center gap-2 data-[state=active]:text-primary"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Conversation</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="logs" 
                        className="premium-tab flex h-full items-center gap-2 data-[state=active]:text-primary"
                      >
                        <Layers className="h-4 w-4" />
                        <span>Logs</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings" 
                        className="premium-tab flex h-full items-center gap-2 data-[state=active]:text-primary"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="p-1">
                    <Routes>
                      <Route 
                        path="/" 
                        element={
                          <TabsContent 
                            key="conversation-tab"
                            value="conversation" 
                            className="mt-0 space-y-6 p-4"
                          >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-center">
                              {/* Left Column: SplitLeftPanel with History and Module Selector */}
                              <motion.div 
                                variants={itemVariants}
                                className="md:col-span-1 mt-0"
                              >
                                <SplitLeftPanel
                                  onSelectModule={handleModuleSelect}
                                />
                              </motion.div>

                              {/* Right Column: Conversation Panel */}
                              <motion.div 
                                variants={itemVariants}
                                className="md:col-span-2 mt-0"
                              >
                                <ConversationPanel />
                              </motion.div>
                            </div>
                          </TabsContent>
                        } 
                      />
                      <Route 
                        path="/conversation" 
                        element={
                          <TabsContent 
                            key="conversation-tab"
                            value="conversation" 
                            className="mt-0 space-y-6 p-4"
                          >
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-center">
                              {/* Left Column: SplitLeftPanel with History and Module Selector */}
                              <motion.div 
                                variants={itemVariants}
                                className="md:col-span-1 mt-0"
                              >
                                <SplitLeftPanel
                                  onSelectModule={handleModuleSelect}
                                />
                              </motion.div>

                              {/* Right Column: Conversation Panel */}
                              <motion.div 
                                variants={itemVariants}
                                className="md:col-span-2 mt-0"
                              >
                                <ConversationPanel />
                              </motion.div>
                            </div>
                          </TabsContent>
                        } 
                      />
                      <Route 
                        path="/logs" 
                        element={
                          <TabsContent 
                            key="logs-tab"
                            value="logs"
                            className="mt-0 p-4"
                          >
                            <motion.div variants={itemVariants}>
                              <LogsDisplay autoRefresh={true} />
                            </motion.div>
                          </TabsContent>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <TabsContent 
                            key="settings-tab"
                            value="settings"
                            className="mt-0 p-4"
                          >
                            <motion.div variants={itemVariants}>
                              <EnvironmentManager />
                            </motion.div>
                          </TabsContent>
                        } 
                      />
                    </Routes>
                  </div>
                </Tabs>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AppLayout>
    </ModuleContext.Provider>
  )
}

export default App
