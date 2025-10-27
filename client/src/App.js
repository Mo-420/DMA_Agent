import React, { useState } from 'react';
import styled from 'styled-components';
import ChatInterface from './components/ChatInterface';
import DebugPanel from './components/DebugPanel';
import Header from './components/Header';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px 0 0 20px;
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const DebugToggle = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover {
    background: #2563eb;
  }
`;

function App() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <AppContainer>
      <MainContent>
        <Header />
        <ChatInterface />
        <DebugToggle onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </DebugToggle>
        {showDebug && <DebugPanel />}
      </MainContent>
    </AppContainer>
  );
}

export default App;
