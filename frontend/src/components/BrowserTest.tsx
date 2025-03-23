import React, { useState, ChangeEvent } from 'react';
import browserService from '../services/browser';

// Check if we need to install antd
// If you don't have antd installed yet, run: npm install antd
// For this example, we'll use simple HTML elements instead
const BrowserTest: React.FC = () => {
  const [url, setUrl] = useState('https://www.amazon.com');
  const [keyword, setKeyword] = useState('mechanical keyboard for programmers');
  const [task, setTask] = useState('Search for mechanical keyboards and find the top 3 options with their prices');
  const [selector, setSelector] = useState('.s-result-item h2');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<string>('');

  const handleNavigate = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await browserService.navigate({ url });
      setResult(response);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setMessage('Navigation successful');
    } catch (error) {
      setMessage('Navigation failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await browserService.extract({ 
        url, 
        selector,
        session_id: sessionId || undefined
      });
      setResult(response);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setMessage('Content extraction successful');
    } catch (error) {
      setMessage('Content extraction failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePerformAction = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await browserService.performAction({
        url,
        task,
        session_id: sessionId || undefined
      });
      setResult(response);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setMessage('Action performed successfully');
    } catch (error) {
      setMessage('Action failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAmazonSearch = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await browserService.amazonSearch(keyword);
      setResult(response);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      setMessage('Amazon search successful');
    } catch (error) {
      setMessage('Amazon search failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) {
      setMessage('No active session to close');
      return;
    }
    
    setLoading(true);
    setMessage('');
    try {
      const response = await browserService.closeSession(sessionId);
      if (response.success) {
        setSessionId(null);
        setResult(response);
        setMessage('Session closed successfully');
      } else {
        setMessage('Failed to close session');
      }
    } catch (error) {
      setMessage('Error closing session');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value);
  const handleSelectorChange = (e: ChangeEvent<HTMLInputElement>) => setSelector(e.target.value);
  const handleKeywordChange = (e: ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value);
  const handleTaskChange = (e: ChangeEvent<HTMLTextAreaElement>) => setTask(e.target.value);

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', border: '1px solid #eee', borderRadius: '5px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2>Browser Automation Test</h2>
      
      {loading && <div style={{ textAlign: 'center', padding: '10px' }}>Loading...</div>}
      
      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          backgroundColor: message.includes('failed') || message.includes('error') ? '#ffeeee' : '#eeffee',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Navigate to URL</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Enter URL"
            value={url}
            onChange={handleUrlChange}
            style={{ flex: 1, padding: '8px' }}
          />
          <button 
            onClick={handleNavigate}
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Navigate
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Extract Content</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="CSS Selector (e.g., .s-result-item h2)"
            value={selector}
            onChange={handleSelectorChange}
            style={{ flex: 1, padding: '8px' }}
          />
          <button 
            onClick={handleExtract}
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Extract
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Perform Action</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            placeholder="Describe what you want the browser to do"
            value={task}
            onChange={handleTaskChange}
            style={{ height: '80px', padding: '8px' }}
          />
          <button 
            onClick={handlePerformAction}
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-end' }}
          >
            Perform Action
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Amazon Search Demo</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search keyword"
            value={keyword}
            onChange={handleKeywordChange}
            style={{ flex: 1, padding: '8px' }}
          />
          <button 
            onClick={handleAmazonSearch}
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Search Amazon
          </button>
        </div>
      </div>

      {sessionId && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <span><strong>Current Session ID:</strong> <code>{sessionId}</code></span>
          <button 
            onClick={handleCloseSession}
            disabled={loading}
            style={{ marginLeft: '10px', padding: '4px 8px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Close Session
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Result:</h3>
          
          {result.result && (
            <div style={{ 
              backgroundColor: '#f9f9f9', 
              padding: '15px', 
              borderRadius: '4px',
              marginBottom: '15px',
              whiteSpace: 'pre-wrap'
            }}>
              <strong>Action Result:</strong><br />
              {result.result}
            </div>
          )}
          
          {result.content && (
            <div style={{ 
              backgroundColor: '#f9f9f9', 
              padding: '15px', 
              borderRadius: '4px',
              marginBottom: '15px',
              whiteSpace: 'pre-wrap'
            }}>
              <strong>Content:</strong><br />
              {result.content}
            </div>
          )}
          
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default BrowserTest; 