import { ReactNode, useEffect, useState, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "../../lib/utils";
import gsap from "gsap";
import { owlApiService } from "../../services/api";
import { Link, useLocation } from "react-router-dom";
import { Tooltip } from "../ui/tooltip";
import { CoffeeIcon } from "../icons/CoffeeIcon";

interface AppLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const headerControls = useAnimation();
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [connecting, setConnecting] = useState(false);
  const [_, setConnectionStatus] = useState<'connected'|'disconnected'|'unknown'>('unknown');
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'conversation';
  
  // Handle mouse movement for highlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!headerRef.current) return;
      
      const header = headerRef.current;
      const rect = header.getBoundingClientRect();
      
      // Calculate mouse position relative to header
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Update CSS variables for the radial gradient
      header.style.setProperty('--mouse-x', `${x}px`);
      header.style.setProperty('--mouse-y', `${y}px`);
    };
    
    if (headerRef.current) {
      headerRef.current.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      if (headerRef.current) {
        headerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);
  
  useEffect(() => {
    // Initialize GSAP animations for premium details
    const tl = gsap.timeline();
    
    tl.fromTo(
      ".gsap-logo-glow", 
      { opacity: 0, scale: 0.95 }, 
      { opacity: 1, scale: 1, duration: 1, ease: "power3.out" }
    );
    
    tl.fromTo(
      ".gsap-header-highlight", 
      { width: "0%" }, 
      { width: "100%", duration: 0.8, ease: "power2.out" }, 
      "-=0.5"
    );
    
    // Animate header on scroll
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const isScrolled = scrollY > 10;
      setScrolled(isScrolled);
      
      headerControls.start({
        backgroundColor: isScrolled 
          ? "rgba(13, 23, 33, 0.9)" 
          : "rgba(13, 23, 33, 0.97)",
        backdropFilter: isScrolled ? "blur(12px)" : "blur(8px)",
        boxShadow: isScrolled 
          ? "0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 1px rgba(0, 0, 0, 0.04)" 
          : "none",
      });
    };
    
    // Call once to set initial state
    handleScroll();
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headerControls]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      // Call the backend connection check
      const isConnected = await owlApiService.checkConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        // This was removed as the API doesn't support it
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error("Failed to connect to backend:", error);
      setConnectionStatus('disconnected');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <motion.header 
        ref={headerRef}
        className="owl-header fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md"
        animate={headerControls}
        initial={{ backgroundColor: "rgba(13, 23, 33, 0.97)" }}
      >
        <div 
          className={cn(
            "container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8",
            "transition-all duration-300",
            scrolled ? "h-16" : "h-20"
          )}
        >
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-3"
          >
            <Link to="/" className="flex items-center gap-3">
              <div className="gsap-logo-glow relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl"></div>
                <div className="premium-glow absolute inset-0 opacity-20">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-md"></div>
                </div>
                <span className="relative text-3xl">🦉</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-light tracking-tight text-white">OWL</h1>
                <div className="h-0.5 w-full overflow-hidden">
                  <div className="gsap-header-highlight h-full w-full bg-gradient-to-r from-blue-400/60 via-blue-500 to-blue-400/60"></div>
                </div>
                <span className="text-xs font-light tracking-wide text-gray-400">Multi-Agent System</span>
              </div>
            </Link>
          </motion.div>
          
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 transform items-center gap-8 md:flex">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Link 
                to="/"
                className={cn(
                  "premium-tab relative text-sm font-normal",
                  currentPath === '' || currentPath === 'conversation' 
                    ? "text-white/90" 
                    : "text-white/75 hover:text-white/90"
                )}
                data-state={currentPath === '' || currentPath === 'conversation' ? "active" : undefined}
              >
                Playground
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Link 
                to="/tools"
                className={cn(
                  "premium-tab relative text-sm font-normal",
                  currentPath === 'tools' 
                    ? "text-white/90" 
                    : "text-white/75 hover:text-white/90"
                )}
                data-state={currentPath === 'tools' ? "active" : undefined}
              >
                Tools
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <a 
                href="https://github.com/camel-ai/owl/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="premium-tab relative text-sm font-normal text-white/75 hover:text-white/90"
              >
                Docs
              </a>
            </motion.div>
          </nav>
          
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Tooltip content="Support OWL Development">
              <a 
                href="https://www.buymeacoffee.com/owl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="coffee-button-glow inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 transition-all duration-300 shadow-md hover:shadow-lg group"
              >
                <div className="flex items-center justify-center w-6 h-6 text-white">
                  <CoffeeIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
              </a>
            </Tooltip>
          </motion.div>
        </div>
      </motion.header>
      
      <main className="container mx-auto px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-28">
        {children}
      </main>
      
      <footer className="relative border-t border-white/5 bg-gradient-to-b from-[rgba(13,23,33,0.97)] to-[rgba(15,23,42,1)] py-12 backdrop-blur-sm">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 h-[200px] w-[600px] -translate-x-1/2 transform bg-blue-500/5 blur-[100px]"></div>
        </div>
        <div className="container relative mx-auto flex flex-col items-center gap-8 px-4 text-center md:flex-row md:justify-between md:text-left">
          <motion.div 
            className="flex max-w-md flex-col gap-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative text-xl">🦉</span>
              <h2 className="text-base font-light tracking-tight text-white">OWL</h2>
            </div>
            <p className="text-sm font-light text-gray-400">
              An advanced multi-agent collaboration system
            </p>
            <p className="text-xs font-light text-gray-500">
              Based on Apache License 2.0
            </p>
          </motion.div>
          
          <div className="flex items-center gap-10">
            <a 
              href="https://github.com/camel-ai/owl" 
              target="_blank" 
              rel="noreferrer" 
              className="group flex items-center gap-1.5 text-sm font-light text-gray-400 transition-colors hover:text-blue-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:scale-110"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span className="relative">
                GitHub
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-blue-400 transition-all group-hover:w-full"></span>
              </span>
            </a>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
            <div className="text-xs font-light text-gray-500">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                © 2025 CAMEL-AI.org
              </motion.div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 