import React from 'react';
import styled from 'styled-components';
import {
  MessageCircle,
  FileText,
  Anchor,
  Settings,
  Menu,
  X
} from 'lucide-react';

const SidebarContainer = styled.div`
  width: ${props => props.isOpen ? '280px' : '0'};
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 0 20px 20px 0;
  box-shadow: 5px 0 20px rgba(0, 0, 0, 0.1);
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background: #f1f5f9;
  }
`;

const Navigation = styled.nav`
  flex: 1;
  padding: 20px 0;
`;

const NavItem = styled.button`
  width: 100%;
  padding: 12px 20px;
  background: ${props => props.active ? '#667eea' : 'transparent'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#5a6fd8' : '#f1f5f9'};
  }
`;

const SidebarFooter = styled.div`
  padding: 20px;
  border-top: 1px solid #e2e8f0;
`;

const CollapsedToggle = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: none;
  border-radius: 50%;
  display: ${props => props.isOpen ? 'none' : 'flex'};
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

function Sidebar({ isOpen, onToggle, currentView, onViewChange }) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'yacht', label: 'Yacht Availability', icon: Anchor },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      <CollapsedToggle isOpen={isOpen} onClick={onToggle}>
        <Menu size={20} />
      </CollapsedToggle>

      <SidebarContainer isOpen={isOpen}>
        <SidebarHeader>
          <Logo>
            <Anchor size={24} />
            DMA Agent
          </Logo>
          <ToggleButton onClick={onToggle}>
            <X size={20} />
          </ToggleButton>
        </SidebarHeader>

        <Navigation>
          {navItems.map(item => (
            <NavItem
              key={item.id}
              active={currentView === item.id}
              onClick={() => onViewChange(item.id)}
            >
              <item.icon size={20} />
              {item.label}
            </NavItem>
          ))}
        </Navigation>

        <SidebarFooter>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            textAlign: 'center' 
          }}>
            DMA Agent v1.0.0
          </div>
        </SidebarFooter>
      </SidebarContainer>
    </>
  );
}

export default Sidebar;
