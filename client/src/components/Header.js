import React from 'react';
import styled from 'styled-components';
import { MessageCircle, Bot } from 'lucide-react';

const HeaderContainer = styled.div`
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h1`
  margin: 0;
  color: #1f2937;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Subtitle = styled.span`
  color: #6b7280;
  font-size: 14px;
  font-weight: normal;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #059669;
  background: #f0fdf4;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #bbf7d0;
`;

function Header() {
  return (
    <HeaderContainer>
      <Title>
        <MessageCircle size={20} />
        Rachel Hoffman
        <Subtitle> - Charter Assistant</Subtitle>
      </Title>
      <StatusIndicator>
        <Bot size={14} />
        AI Assistant Active
      </StatusIndicator>
    </HeaderContainer>
  );
}

export default Header;