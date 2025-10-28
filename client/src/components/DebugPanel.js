import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Cloud, 
  Ship, 
  FileText, 
  User, 
  Mail,
  Settings,
  Activity
} from 'lucide-react';
import { getIntegrationStatus, getAgentInsights } from '../services/api';

const DebugOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const DebugContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const DebugHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DebugTitle = styled.h2`
  margin: 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #dc2626;
  }
`;

const DebugContent = styled.div`
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;

const Section = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

const StatusLabel = styled.span`
  font-size: 14px;
  color: #374151;
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  
  &.success {
    color: #059669;
  }
  
  &.error {
    color: #dc2626;
  }
  
  &.warning {
    color: #d97706;
  }
  
  &.info {
    color: #2563eb;
  }
`;

const RefreshButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const MissingItem = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 4px 0;
  font-size: 13px;
  color: #991b1b;
`;

const WorkingItem = styled.div`
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 8px 12px;
  margin: 4px 0;
  font-size: 13px;
  color: #166534;
`;

const ApiEndpoint = styled.code`
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
`;

function DebugPanel() {
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [status, agentInsights] = await Promise.all([
        getIntegrationStatus(),
        getAgentInsights()
      ]);
      setIntegrationStatus(status);
      setInsights(agentInsights);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error refreshing debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getStatusIcon = (status) => {
    if (status === true || status === 'connected') {
      return <CheckCircle size={16} className="success" />;
    } else if (status === false || status === 'disconnected') {
      return <XCircle size={16} className="error" />;
    } else if (status === 'warning') {
      return <AlertCircle size={16} className="warning" />;
    }
    return <AlertCircle size={16} className="info" />;
  };

  const getStatusText = (status) => {
    if (status === true || status === 'connected') return 'Connected';
    if (status === false || status === 'disconnected') return 'Disconnected';
    if (status === 'warning') return 'Warning';
    return 'Unknown';
  };

  const getStatusClass = (status) => {
    if (status === true || status === 'connected') return 'success';
    if (status === false || status === 'disconnected') return 'error';
    if (status === 'warning') return 'warning';
    return 'info';
  };

  return (
    <DebugOverlay>
      <DebugContainer>
        <DebugHeader>
          <DebugTitle>
            <Activity size={20} />
            System Debug Panel
          </DebugTitle>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <RefreshButton onClick={refreshData} disabled={loading}>
              <RefreshCw size={14} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </RefreshButton>
            <CloseButton onClick={() => window.location.reload()}>
              Close
            </CloseButton>
          </div>
        </DebugHeader>
        
        <DebugContent>
          {/* System Status */}
          <Section>
            <SectionTitle>
              <Settings size={18} />
              System Status
            </SectionTitle>
            <StatusItem>
              <StatusLabel>Backend API</StatusLabel>
              <StatusIcon className="success">
                <CheckCircle size={16} />
                Running on :3004
              </StatusIcon>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Frontend</StatusLabel>
              <StatusIcon className="success">
                <CheckCircle size={16} />
                Running on :3001
              </StatusIcon>
            </StatusItem>
            <StatusItem>
              <StatusLabel>Last Refresh</StatusLabel>
              <StatusIcon className="info">
                {lastRefresh || 'Never'}
              </StatusIcon>
            </StatusItem>
          </Section>

          {/* API Integrations */}
          <Section>
            <SectionTitle>
              <Cloud size={18} />
              API Integrations
            </SectionTitle>
            {integrationStatus ? (
              <>
                <StatusItem>
                  <StatusLabel>Google Drive</StatusLabel>
                  <StatusIcon className={getStatusClass(integrationStatus.googleDrive)}>
                    {getStatusIcon(integrationStatus.googleDrive)}
                    {getStatusText(integrationStatus.googleDrive)}
                  </StatusIcon>
                </StatusItem>
                <StatusItem>
                  <StatusLabel>Yacht API</StatusLabel>
                  <StatusIcon className={getStatusClass(integrationStatus.yachtApi)}>
                    {getStatusIcon(integrationStatus.yachtApi)}
                    {getStatusText(integrationStatus.yachtApi)}
                  </StatusIcon>
                </StatusItem>
                <StatusItem>
                  <StatusLabel>Yachtsummary API</StatusLabel>
                  <StatusIcon className={getStatusClass(integrationStatus.yachtsummaryApi)}>
                    {getStatusIcon(integrationStatus.yachtsummaryApi)}
                    {getStatusText(integrationStatus.yachtsummaryApi)}
                  </StatusIcon>
                </StatusItem>
              </>
            ) : (
              <StatusItem>
                <StatusLabel>Loading...</StatusLabel>
                <StatusIcon className="info">Checking...</StatusIcon>
              </StatusItem>
            )}
          </Section>

          {/* Available Endpoints */}
          <Section>
            <SectionTitle>
              <Database size={18} />
              Available Endpoints
            </SectionTitle>
            <div style={{ fontSize: '13px', color: '#374151' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Chat:</strong>
                <ApiEndpoint>POST /api/chat/message</ApiEndpoint>
                <ApiEndpoint>GET /api/chat/history</ApiEndpoint>
                <ApiEndpoint>GET /api/chat/insights/:userId</ApiEndpoint>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Documents:</strong>
                <ApiEndpoint>GET /api/documents</ApiEndpoint>
                <ApiEndpoint>POST /api/documents/upload</ApiEndpoint>
                <ApiEndpoint>GET /api/documents/search</ApiEndpoint>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Yachts:</strong>
                <ApiEndpoint>GET /api/yacht/availability</ApiEndpoint>
                <ApiEndpoint>GET /api/yacht/details/:id</ApiEndpoint>
              </div>
              <div>
                <strong>Admin:</strong>
                <ApiEndpoint>GET /api/status/integrations</ApiEndpoint>
                <ApiEndpoint>GET /auth/google</ApiEndpoint>
              </div>
            </div>
          </Section>

          {/* Current Data */}
          <Section>
            <SectionTitle>
              <User size={18} />
              Current Data
            </SectionTitle>
            {insights?.client ? (
              <WorkingItem>
                <strong>Client Profile:</strong> {insights.client.name} ({insights.client.email})
              </WorkingItem>
            ) : (
              <MissingItem>No client profile loaded</MissingItem>
            )}
            
            {insights?.yachts?.length > 0 ? (
              <WorkingItem>
                <strong>Yachts Available:</strong> {insights.yachts.length} yachts
              </WorkingItem>
            ) : (
              <MissingItem>No yacht data available</MissingItem>
            )}
            
            {insights?.documents?.length > 0 ? (
              <WorkingItem>
                <strong>Documents:</strong> {insights.documents.length} documents indexed
              </WorkingItem>
            ) : (
              <MissingItem>No documents indexed</MissingItem>
            )}
          </Section>

          {/* Missing Components */}
          <Section>
            <SectionTitle>
              <AlertCircle size={18} />
              Missing Components
            </SectionTitle>
            <MissingItem>OpenAI API Key (required for chat)</MissingItem>
            <MissingItem>Google Drive OAuth (for document access)</MissingItem>
            <MissingItem>Yacht API credentials (for real availability)</MissingItem>
            <MissingItem>Yachtsummary API key (for client profiles)</MissingItem>
            <MissingItem>Email service configuration</MissingItem>
            <MissingItem>Production database setup</MissingItem>
          </Section>

          {/* Working Features */}
          <Section>
            <SectionTitle>
              <CheckCircle size={18} />
              Working Features
            </SectionTitle>
            <WorkingItem>Chat interface with Rachel Hoffman persona</WorkingItem>
            <WorkingItem>Mock yacht availability data</WorkingItem>
            <WorkingItem>Mock client profile system</WorkingItem>
            <WorkingItem>Document upload and search</WorkingItem>
            <WorkingItem>Email draft generation</WorkingItem>
            <WorkingItem>Integration status monitoring</WorkingItem>
            <WorkingItem>Debug panel and system diagnostics</WorkingItem>
          </Section>

          {/* Next Steps */}
          <Section>
            <SectionTitle>
              <FileText size={18} />
              Next Steps
            </SectionTitle>
            <div style={{ fontSize: '13px', color: '#374151' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>1. Add API Keys:</strong> Update .env file with real credentials
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>2. Authorize Google Drive:</strong> Visit /auth/google endpoint
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>3. Test Chat:</strong> Start conversation with Rachel
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>4. Upload Documents:</strong> Add DMA manual and other docs
              </div>
              <div>
                <strong>5. Deploy:</strong> Configure production environment
              </div>
            </div>
          </Section>
        </DebugContent>
      </DebugContainer>
    </DebugOverlay>
  );
}

export default DebugPanel;



