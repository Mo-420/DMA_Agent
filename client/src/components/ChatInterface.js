import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Send, Bot, User, Loader, Settings, RefreshCw, Activity } from 'lucide-react';
import { sendMessage, getChatHistory } from '../services/api';

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Message = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  ${props => props.isUser ? 'flex-direction: row-reverse;' : ''}
`;

const MessageAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.isUser ? '#667eea' : '#764ba2'};
  color: white;
  flex-shrink: 0;
`;

const MessageContent = styled.div`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background: ${props => props.isUser ? '#667eea' : '#ffffff'};
  color: ${props => props.isUser ? '#ffffff' : '#374151'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
  line-height: 1.5;
`;

const InputContainer = styled.div`
  padding: 20px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  align-items: center;
`;

const InputField = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 24px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #667eea;
  }
`;

const SendButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover:not(:disabled) {
    background: #5a67d8;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-style: italic;
`;

const StatusBar = styled.div`
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6b7280;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
`;

const WelcomeTitle = styled.h2`
  color: #374151;
  margin-bottom: 8px;
`;

const WelcomeSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
`;

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    connected: true,
    lastMessage: null
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendMessage(inputValue.trim());
      const botMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setSystemStatus(prev => ({
        ...prev,
        lastMessage: new Date().toLocaleTimeString()
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <MessagesContainer>
        {messages.length === 0 && (
          <WelcomeMessage>
            <WelcomeTitle>Welcome to Rachel Hoffman's Charter Assistant</WelcomeTitle>
            <WelcomeSubtitle>
              I'm here to help you find the perfect yacht for your clients. 
              Ask me about availability, yacht details, or client preferences.
            </WelcomeSubtitle>
          </WelcomeMessage>
        )}
        
        {messages.map((message, index) => (
          <Message key={index} isUser={message.role === 'user'}>
            <MessageAvatar isUser={message.role === 'user'}>
              {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </MessageAvatar>
            <MessageContent isUser={message.role === 'user'}>
              {message.content}
            </MessageContent>
          </Message>
        ))}
        
        {isLoading && (
          <Message>
            <MessageAvatar>
              <Bot size={20} />
            </MessageAvatar>
            <MessageContent>
              <LoadingMessage>
                <Loader size={16} />
                Rachel is thinking...
              </LoadingMessage>
            </MessageContent>
          </Message>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <InputField
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask Rachel about yacht availability, client preferences, or anything else..."
          disabled={isLoading}
        />
        <SendButton onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
          <Send size={20} />
        </SendButton>
      </InputContainer>

      <StatusBar>
        <StatusItem>
          <Activity size={14} />
          {systemStatus.connected ? 'Connected' : 'Disconnected'}
        </StatusItem>
        <StatusItem>
          <RefreshCw size={14} />
          Last message: {systemStatus.lastMessage || 'None'}
        </StatusItem>
        <StatusItem>
          <Settings size={14} />
          Rachel Hoffman - Charter Assistant
        </StatusItem>
      </StatusBar>
    </ChatContainer>
  );
}

export default ChatInterface;