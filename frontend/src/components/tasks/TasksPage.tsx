import React, { useState } from 'react';
import { TaskExecutor } from './TaskExecutor';
import { TaskList } from './TaskList';

export const TasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'execute' | 'list'>('execute');
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${
                activeTab === 'execute' 
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                  : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('execute')}
            >
              Execute Task
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${
                activeTab === 'list' 
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                  : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('list')}
            >
              View Tasks
            </button>
          </li>
        </ul>
      </div>
      
      <div className="mt-4">
        {activeTab === 'execute' && (
          <TaskExecutor 
            placeholder="Enter a task to execute. The system will automatically determine which tools to use."
            contextData={{ source: 'tasks_page' }}
          />
        )}
        
        {activeTab === 'list' && (
          <TaskList 
            limit={20}
            autoRefresh={true}
            refreshInterval={10000}
          />
        )}
      </div>
    </div>
  );
}; 