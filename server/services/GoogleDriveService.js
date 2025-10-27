const { google } = require('googleapis');
const TokenStore = require('../utils/TokenStore');

class GoogleDriveService {
  constructor() {
    this.oauth2Client = null;
    this.drive = null;
    this.isReady = false;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
          // Try service account first (check both PATH and JSON env vars)
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountPath || serviceAccountJson) {
      console.log('Using service account authentication...');
      let serviceAccount;
      
      if (serviceAccountJson) {
        // Parse JSON string from environment variable
        serviceAccount = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString());
      } else if (serviceAccountPath) {
        // Load from file
        serviceAccount = require(serviceAccountPath);
      }
        
        this.oauth2Client = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
        
        this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        this.isReady = true;
        console.log('✓ Service account authentication successful');
        return;
      }
      
      // Fallback to OAuth
      if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
        console.warn('Google Drive credentials not configured');
        return;
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET,
        'http://localhost:3004/auth/google/callback'
      );

      const savedTokens = await TokenStore.getToken('google-drive');
      if (savedTokens) {
        this.oauth2Client.setCredentials(savedTokens);
      }

      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      this.isReady = true;
    } catch (error) {
      console.error('Error initializing Google Drive auth:', error);
      this.isReady = false;
    }
  }

  getAuthUrl(scopes = ['https://www.googleapis.com/auth/drive.readonly']) {
    if (!this.oauth2Client) {
      throw new Error('Google Drive OAuth client not initialized');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });
  }

  async handleOAuthCallback(code) {
    if (!this.oauth2Client) {
      throw new Error('Google Drive OAuth client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await TokenStore.setToken('google-drive', tokens);
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.isReady = true;
    return tokens;
  }

  async refreshIfNeeded() {
    if (!this.oauth2Client) return;

    const tokens = await TokenStore.getToken('google-drive');
    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await TokenStore.setToken('google-drive', credentials);
        this.oauth2Client.setCredentials(credentials);
      }
    }
  }

  async ensureDrive() {
    if (!this.drive) {
      await this.initializeAuth();
    }
    await this.refreshIfNeeded();
    if (!this.drive) {
      throw new Error('Google Drive is not authorized');
    }
  }

  async searchFiles(query, mimeType = null) {
    try {
      await this.ensureDrive();

      let searchQuery = `name contains '${query}' or fullText contains '${query}'`;
      if (mimeType) {
        searchQuery += ` and mimeType='${mimeType}'`;
      }

      const response = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id,name,mimeType,webViewLink,createdTime,modifiedTime,size)',
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error searching Google Drive files:', error);
      throw new Error('Failed to search Google Drive files');
    }
  }

  async getFileContent(fileId) {
    try {
      await this.ensureDrive();

      // Get file metadata first
      const fileMetadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size'
      });

      const file = fileMetadata.data;

      // For text files, get content directly
      if (file.mimeType === 'text/plain' || file.mimeType === 'text/html') {
        const response = await this.drive.files.get({
          fileId: fileId,
          alt: 'media'
        });
        return {
          content: response.data,
          metadata: file
        };
      }

      // For Google Docs, export as plain text
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/plain'
        });
        return {
          content: response.data,
          metadata: file
        };
      }

      // For PDFs, we'd need to download and process them
      // This is a simplified version
      return {
        content: `[${file.mimeType} file - content extraction not implemented]`,
        metadata: file
      };

    } catch (error) {
      console.error('Error getting file content:', error);
      throw new Error('Failed to get file content');
    }
  }

  async getFileById(fileId) {
    try {
      await this.ensureDrive();

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,webViewLink,createdTime,modifiedTime,size,parents'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file by ID:', error);
      throw new Error('Failed to get file');
    }
  }

  async listRecentFiles(maxResults = 10) {
    try {
      await this.ensureDrive();

      const response = await this.drive.files.list({
        pageSize: maxResults,
        fields: 'files(id,name,mimeType,webViewLink,createdTime,modifiedTime,size)',
        orderBy: 'modifiedTime desc'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error listing recent files:', error);
      throw new Error('Failed to list recent files');
    }
  }

  async searchDocuments(query) {
    try {
      // Search for common document types
      const documentTypes = [
        'application/pdf',
        'application/vnd.google-apps.document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ];

      const results = [];
      
      for (const mimeType of documentTypes) {
        const files = await this.searchFiles(query, mimeType);
        results.push(...files);
      }

      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  // Mock data for development/testing
  getMockDriveFiles() {
    return [
      {
        id: 'mock-file-1',
        name: 'DMA User Manual.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'https://drive.google.com/file/d/mock-file-1/view',
        createdTime: '2024-01-15T10:00:00.000Z',
        modifiedTime: '2024-10-23T14:30:00.000Z',
        size: '2.5MB'
      },
      {
        id: 'mock-file-2',
        name: 'Yacht Safety Procedures.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        webViewLink: 'https://drive.google.com/file/d/mock-file-2/view',
        createdTime: '2024-02-20T09:15:00.000Z',
        modifiedTime: '2024-10-22T16:45:00.000Z',
        size: '1.2MB'
      }
    ];
  }

  getMockFileContent(fileId) {
    const mockContent = {
      'mock-file-1': {
        content: `DMA User Manual

Chapter 1: Introduction
This manual covers all aspects of yacht management and operations.

Chapter 2: Safety Procedures
- Always wear life jackets when on deck
- Check weather conditions before departure
- Maintain emergency equipment
- Conduct safety briefings with all passengers

Chapter 3: Maintenance
- Regular engine checks
- Hull cleaning and inspection
- Electrical system maintenance
- Navigation equipment testing`,
        metadata: {
          id: 'mock-file-1',
          name: 'DMA User Manual.pdf',
          mimeType: 'application/pdf',
          size: '2.5MB'
        }
      },
      'mock-file-2': {
        content: `Yacht Safety Procedures

Emergency Procedures:
1. Man Overboard
2. Fire Safety
3. Medical Emergencies
4. Weather Emergencies

Equipment Checklist:
- Life jackets for all passengers
- Emergency flares
- First aid kit
- Radio communication`,
        metadata: {
          id: 'mock-file-2',
          name: 'Yacht Safety Procedures.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: '1.2MB'
        }
      }
    };

    return mockContent[fileId] || null;
  }
}

module.exports = new GoogleDriveService();
