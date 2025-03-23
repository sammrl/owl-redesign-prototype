import React, { useState, useEffect, useRef } from 'react';
import { owlApiService } from '../../services/api';

interface ChatMessage {
    role: string;
    content: string;
    token_count?: number;
    timestamp?: string;
}

interface CamelChatProps {
    initialMessage?: string;
    className?: string;
}

export const CamelChat: React.FC<CamelChatProps> = ({ 
    initialMessage = "How can I help you today?",
    className = "" 
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: initialMessage }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to WebSocket
        const ws = owlApiService.connectWebSocket(handleWebSocketMessage);
        wsRef.current = ws;

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleWebSocketMessage = (response: any) => {
        if (response.status === 'success') {
            setIsLoading(false);
            if (response.chat_history) {
                setMessages(prev => {
                    // Keep existing messages but add the new chat history
                    const newMessages = response.chat_history;
                    return [...prev, ...newMessages];
                });
            } else if (response.response) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
            }
        } else if (response.status === 'error') {
            setIsLoading(false);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Error: ${response.error || 'An unknown error occurred'}` 
            }]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Add user message
        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Try WebSocket first if available
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                owlApiService.sendWebSocketQuery(wsRef.current, input);
            } else {
                // Fall back to HTTP API
                const result = await owlApiService.runQuerySync({
                    query: input
                });

                setIsLoading(false);
                if (result.chat_history) {
                    // Filter out existing messages
                    const existingIds = new Set(messages.map(m => m.content));
                    const newMessages = result.chat_history.filter(m => !existingIds.has(m.content));
                    
                    if (newMessages.length > 0) {
                        setMessages(prev => [...prev, ...newMessages]);
                    } else {
                        // If no new messages, at least add the answer
                        setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
                    }
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: result.answer }]);
                }
            }
        } catch (error: any) {
            setIsLoading(false);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Error: ${error.message || 'An unknown error occurred'}` 
            }]);
        }
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                                message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-800'
                            }`}
                        >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.token_count && (
                                <span className="text-xs opacity-50">
                                    Tokens: {message.token_count}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 rounded-lg p-3">
                            <div className="animate-pulse">Thinking...</div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex space-x-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`px-4 py-2 rounded-lg ${
                            isLoading || !input.trim()
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                        } text-white transition-colors`}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}; 