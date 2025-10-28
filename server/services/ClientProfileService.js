const axios = require('axios');

class ClientProfileService {
  constructor() {
    this.baseURL = process.env.YACHTSUMMARY_API_BASE_URL;
    this.apiKey = process.env.YACHTSUMMARY_API_KEY;
    this.timeout = Number(process.env.YACHTSUMMARY_API_TIMEOUT || 8000);
  }

  get axiosInstance() {
    if (!this.baseURL || !this.apiKey) {
      throw new Error('Yachtsummary API not configured');
    }
    return axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });
  }

  async safeRequest(fn) {
    try {
      const response = await fn();
      return response.data;
    } catch (error) {
      console.error('Yachtsummary API error:', error.message);
      throw new Error('Client data unavailable');
    }
  }

  async getClientProfile(clientId) {
    return this.safeRequest(() => this.axiosInstance.get(`/clients/${clientId}`));
  }

  async getClientChats(clientId) {
    return this.safeRequest(() => this.axiosInstance.get(`/clients/${clientId}/chats`));
  }

  async searchClients(query) {
    return this.safeRequest(() => this.axiosInstance.get('/clients', { params: { q: query } }));
  }
}

module.exports = new ClientProfileService();




