import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export const sendMessage = async (message, context = {}, userId = 'default') => {
  try {
    const response = await api.post('/chat/message', {
      message,
      context,
      userId
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getChatHistory = async (userId = 'default') => {
  try {
    const response = await api.get(`/chat/history/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
};

export const clearChatHistory = async (userId = 'default') => {
  try {
    const response = await api.delete(`/chat/history/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
};

export const getAgentCapabilities = async () => {
  try {
    const response = await api.get('/chat/capabilities');
    return response.data;
  } catch (error) {
    console.error('Error getting agent capabilities:', error);
    throw error;
  }
};

export const getAgentInsights = async () => {
  try {
    const response = await api.get('/chat/insights');
    return response.data;
  } catch (error) {
    console.error('Error getting agent insights:', error);
    return { client: null, yachts: [], documents: [] };
  }
};

export const getIntegrationStatus = async () => {
  try {
    const response = await api.get('/status/integrations');
    return response.data;
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return null;
  }
};

// Document API
export const getDocuments = async () => {
  try {
    const response = await api.get('/documents');
    return response.data;
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

export const getDocument = async (id) => {
  try {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

export const searchDocuments = async (query, filters = {}) => {
  try {
    const response = await api.post('/documents/search', {
      query,
      filters
    });
    return response.data;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

export const uploadDocument = async (file, metadata = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

// Yacht API
export const getYachtAvailability = async (options = {}) => {
  try {
    const response = await api.get('/yacht/availability', {
      params: options
    });
    return response.data;
  } catch (error) {
    console.error('Error getting yacht availability:', error);
    throw error;
  }
};

export const getYachtDetails = async (yachtId) => {
  try {
    const response = await api.get(`/yacht/${yachtId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting yacht details:', error);
    throw error;
  }
};

export const searchYachts = async (criteria) => {
  try {
    const response = await api.post('/yacht/search', { criteria });
    return response.data;
  } catch (error) {
    console.error('Error searching yachts:', error);
    throw error;
  }
};

export const bookYacht = async (bookingData) => {
  try {
    const response = await api.post('/yacht/book', bookingData);
    return response.data;
  } catch (error) {
    console.error('Error booking yacht:', error);
    throw error;
  }
};

export const getBookingStatus = async (bookingId) => {
  try {
    const response = await api.get(`/yacht/booking/${bookingId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting booking status:', error);
    throw error;
  }
};

export default api;
