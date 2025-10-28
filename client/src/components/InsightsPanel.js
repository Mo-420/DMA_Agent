import React from 'react';
import styled from 'styled-components';
import { Anchor, FileText, Info, RefreshCcw } from 'lucide-react';

const PanelContainer = styled.div`
  width: 320px;
  background: rgba(255, 255, 255, 0.92);
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const Section = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
`;

const Item = styled.div`
  font-size: 14px;
  color: #4a5568;
  margin-bottom: 6px;
  line-height: 1.4;
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
  margin-right: 6px;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const StatusDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.active ? '#10b981' : '#f97316'};
  margin-right: 6px;
`;

const LinkButton = styled.a`
  font-size: 13px;
  color: #4338ca;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  font-size: 13px;
  color: #a0aec0;
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: #4338ca;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  &:hover {
    text-decoration: underline;
  }
`;

function SectionWrapper({ icon: Icon, title, children, extra }) {
  return (
    <Section>
      <SectionHeader>
        <Icon size={18} />
        <span>{title}</span>
        {extra}
      </SectionHeader>
      {children}
    </Section>
  );
}

export default function InsightsPanel({ clientInsights, yachtSuggestions, documentInsights, integrationStatus, onRefreshYachts }) {
  return (
    <PanelContainer>
      <SectionWrapper icon={Info} title="Client Snapshot">
        {clientInsights ? (
          <>
            {clientInsights.name && <Item><strong>{clientInsights.name}</strong></Item>}
            {clientInsights.email && <Item>Email: {clientInsights.email}</Item>}
            {clientInsights.phone && <Item>Phone: {clientInsights.phone}</Item>}
            {clientInsights.preferences && <Item>Preferences: {clientInsights.preferences}</Item>}
            {clientInsights.intent && <Item>Intent: <Pill>{clientInsights.intent}</Pill></Item>}
          </>
        ) : (
          <EmptyState>No client context yet. Start the conversation.</EmptyState>
        )}
      </SectionWrapper>

      <SectionWrapper
        icon={Anchor}
        title="Yacht Suggestions"
        extra={onRefreshYachts && (
          <RefreshButton onClick={onRefreshYachts}>
            <RefreshCcw size={14} /> Refresh
          </RefreshButton>
        )}
      >
        {yachtSuggestions && yachtSuggestions.length ? (
          yachtSuggestions.map(yacht => (
            <Item key={yacht.id || yacht.name}>
              <strong>{yacht.name}</strong> – {yacht.type}<br />
              {yacht.capacity ? `${yacht.capacity} guests` : ''}
              {yacht.rate ? ` • ${yacht.rate}` : ''}
              {yacht.location ? ` • ${yacht.location}` : ''}
            </Item>
          ))
        ) : (
          <EmptyState>No yachts recommended yet.</EmptyState>
        )}
      </SectionWrapper>

      <SectionWrapper icon={FileText} title="Document Highlights">
        {documentInsights && documentInsights.length ? (
          documentInsights.map((doc, index) => (
            <Item key={`${doc.id}-${index}`}>
              <strong>{doc.title}</strong><br />
              {doc.snippet}
              {doc.link && (
                <div>
                  <LinkButton href={doc.link} target="_blank" rel="noreferrer">
                    Open document
                  </LinkButton>
                </div>
              )}
            </Item>
          ))
        ) : (
          <EmptyState>No document context yet.</EmptyState>
        )}
      </SectionWrapper>

      <SectionWrapper icon={Info} title="Integration Status">
        {integrationStatus ? (
          <>
            <StatusRow>
              <div><StatusDot active={integrationStatus.driveReady} />Google Drive</div>
              <span>{integrationStatus.driveReady ? 'Connected' : 'Auth needed'}</span>
            </StatusRow>
            <StatusRow>
              <div><StatusDot active={integrationStatus.yachtApiReady} />Yacht API</div>
              <span>{integrationStatus.yachtApiReady ? 'Online' : 'Using mock data'}</span>
            </StatusRow>
            <StatusRow>
              <div><StatusDot active={integrationStatus.clientApiReady} />Client data</div>
              <span>{integrationStatus.clientApiReady ? 'Available' : 'Unavailable'}</span>
            </StatusRow>
          </>
        ) : (
          <EmptyState>Integration status unavailable.</EmptyState>
        )}
      </SectionWrapper>
    </PanelContainer>
  );
}




