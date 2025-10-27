const axios = require('axios');

class YachtService {
  constructor() {
    this.baseURL = process.env.YACHT_API_BASE_URL || process.env.YACHTSUMMARY_API_BASE_URL || 'https://api.yacht-availability.com';
    this.apiKey = process.env.YACHT_API_KEY || process.env.YACHTSUMMARY_API_KEY;
    this.timeout = Number(process.env.YACHT_API_TIMEOUT || 8000);
    this.cache = {
      availability: null,
      yachts: new Map(),
      timestamp: null
    };
    this.cacheTtlMs = Number(process.env.YACHT_CACHE_TTL_MS || 5 * 60 * 1000);
  }

  get axiosInstance() {
    return axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined
    });
  }

  async safeRequest(fn, fallback) {
    try {
      if (!this.baseURL || !this.apiKey) {
        throw new Error('Yacht API not configured');
      }
      const response = await fn();
      return response.data;
    } catch (error) {
      console.warn('Yacht API error, falling back to mock data:', error.message);
      if (fallback) return fallback();
      throw new Error('Yacht data unavailable');
    }
  }

  async getAvailability(options = {}) {
    const cacheKey = JSON.stringify(options);
    const now = Date.now();
    if (this.cache.availability && this.cache.availability.key === cacheKey && now - this.cache.availability.time < this.cacheTtlMs) {
      return this.cache.availability.data;
    }

    const data = await this.safeRequest(
      () => this.axiosInstance.get('/availability', {
        params: {
          start_date: options.startDate,
          end_date: options.endDate,
          location: options.location,
          yacht_type: options.yachtType
        }
      }),
      () => this.getMockAvailability(options)
    );

    this.cache.availability = {
      key: cacheKey,
      data,
      time: now
    };

    return data;
  }

  async getYachtDetails(yachtId) {
    const now = Date.now();
    if (this.cache.yachts.has(yachtId)) {
      const cached = this.cache.yachts.get(yachtId);
      if (now - cached.time < this.cacheTtlMs) {
        return cached.data;
      }
    }

    const data = await this.safeRequest(
      () => this.axiosInstance.get(`/yachts/${yachtId}`),
      () => this.getMockYachtDetails(yachtId)
    );

    this.cache.yachts.set(yachtId, { data, time: now });
    return data;
  }

  async searchYachts(criteria) {
    return this.safeRequest(
      () => this.axiosInstance.get('/yachts/search', { params: criteria }),
      () => this.getMockAvailability(criteria)
    );
  }

  async createBooking(bookingData) {
    return this.safeRequest(
      () => this.axiosInstance.post('/bookings', bookingData)
    );
  }

  async getBookingStatus(bookingId) {
    return this.safeRequest(
      () => this.axiosInstance.get(`/bookings/${bookingId}`)
    );
  }

  // Mock data for development/testing
  getMockAvailability(options = {}) {
    return {
      yachts: [
        {
          id: 'yacht-001',
          name: 'Luxury Yacht Alpha',
          type: 'Motor Yacht',
          capacity: 12,
          length: '50m',
          location: 'Monaco',
          price_per_day: 15000,
          available: true,
          amenities: ['Jacuzzi', 'Helipad', 'Gym', 'Cinema'],
          images: ['https://example.com/yacht1.jpg']
        },
        {
          id: 'yacht-002',
          name: 'Sailing Yacht Beta',
          type: 'Sailing Yacht',
          capacity: 8,
          length: '35m',
          location: 'Croatia',
          price_per_day: 8000,
          available: true,
          amenities: ['Spa', 'Diving Equipment', 'Water Sports'],
          images: ['https://example.com/yacht2.jpg']
        }
      ],
      total_count: 2,
      search_criteria: options
    };
  }

  getMockYachtDetails(yachtId) {
    const yachts = this.getMockAvailability().yachts;
    return yachts.find(yacht => yacht.id === yachtId) || null;
  }

  clearCache() {
    this.cache.availability = null;
    this.cache.yachts.clear();
  }
}

module.exports = new YachtService();
