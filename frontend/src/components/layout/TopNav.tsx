import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from '@/components/ui/tooltip';
import { CoffeeIcon } from '@/components/icons/CoffeeIcon';

const TopNav: React.FC = () => {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/owl-logo.svg" alt="OWL" className="h-6 w-6" />
            <div className="font-semibold text-lg leading-none tracking-tight">
              OWL
              <span className="text-xs font-normal text-muted-foreground ml-1.5 tracking-wide">
                Multi-Agent System
              </span>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center ml-auto space-x-1">
          <Link to="/playground" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-accent transition-colors">
            Playground
          </Link>
          <Link to="/docs" className="text-sm font-medium px-3 py-2 rounded-md hover:bg-accent transition-colors">
            Documentation
          </Link>
          
          <Tooltip content="Support OWL Development">
            <a 
              href="https://www.buymeacoffee.com/owl" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 p-2 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 transition-all duration-300 shadow-md hover:shadow-lg group"
            >
              <div className="flex items-center justify-center w-6 h-6 text-white">
                <CoffeeIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>
            </a>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default TopNav; 