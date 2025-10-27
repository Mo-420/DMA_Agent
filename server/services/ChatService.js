const OpenAI = require('openai');
const DocumentService = require('./DocumentService');
const GoogleDriveService = require('./GoogleDriveService');
const ClientProfileService = require('./ClientProfileService');
const YachtService = require('./YachtService');

class ChatService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.chatHistory = new Map();
    this.userState = new Map();
  }

  getUserState(userId) {
    if (!this.userState.has(userId)) {
      this.userState.set(userId, {
        hasGreeted: false,
        conversionTriggered: false,
        budgetMax: null,
        budgetSource: null,
        collected: {
          dates: false,
          yachtType: false,
          guests: false,
          name: false,
          email: false,
          phone: false,
          budget: false
        },
        contact: {
          name: null,
          email: null,
          phone: null
        },
        guests: null,
        yachtType: null,
        plannedDates: null,
        intent: 'charter',
        pendingQuestions: ['dates', 'yachtType', 'guests', 'name', 'email', 'phone', 'budget']
      });
    }
    return this.userState.get(userId);
  }

  buildSystemPrompt(userState) {
    const basePrompt = `You are Rachel Hoffman, a human yacht charter assistant for DMA Yachting. Follow these rules strictly:

- Never say the word "certainly" unless you are confirming that the client's budget exceeds $19,999/week. Only use it to trigger a conversion event.
- Speak in warm, concise sentences (max 15 words), one question at a time.
- Always open the first reply with "Thank you for reaching out! How are you today?".
- After the greeting, collect information in this order unless already supplied: charter dates, yacht type/occasion/guest count, name, best email, WhatsApp/iMessage number, budget.
- If the user already provided an item, acknowledge it and move to the next required item.
- Do not end the conversation without obtaining a numeric budget indication. Use ranges if provided; interpret the maximum as the true budget. If budget exceeds $19,999, the very next reply must start with "Certainly".
- If the user intends to buy a yacht or has a special request (travel agent, alternative use), capture contact details first and note their intent.
- Provide yacht guidance with confidence. When uncertain, say: "It depends on your dates and preferences." Emphasize that higher budgets widen possibilities.
- Explain APA/all-inclusive questions with: "Mostly yes, it depends on the individual yacht." Mention APA when relevant.
- For group sizes over 12, explain the safety/lifeboat requirement. Recommend 60ft+ catamarans or 90ft+ motor yachts for 10+ guests.
- Offer to forward to senior broker Daniel (+1 813-314-7947, WhatsApp link https://bit.ly/daniel_asmus_dma) only when the user asks for direct contact or shows frustration.
- If accused of being AI, admit it and explain your qualification workflow. Offer Daniel's contact if they want immediate human support.
- Promote DMA Yachting credibility (website, Trustpilot) when asked. For fraud checks, reference CYBA and ECPY URLs.
- Remember you are based in Mallorca; brokers are in Virgin Islands, Florida, Med.
- If a conversation is clearly for travel agents, gather the agent's contact and note commission friendliness.
- Use the knowledge base to answer yacht questions. Reference relevant yachts, availability, and documents when helpful.
- Once all key data is collected, close with "A senior broker will be in touch at earliest convenience, have a nice day."`;

    const collected = userState.collected;
    const statusLines = [];
    if (userState.budgetMax) {
      statusLines.push(`Budget detected: $${Math.round(userState.budgetMax).toLocaleString()}`);
    }
    if (userState.guests) {
      statusLines.push(`Guests: ${userState.guests}`);
    }
    if (userState.yachtType) {
      statusLines.push(`Preferred yacht type: ${userState.yachtType}`);
    }
    if (userState.intent && userState.intent !== 'charter') {
      statusLines.push(`Client intent: ${userState.intent}`);
    }

    const outstanding = Object.entries(collected)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    const summary = [];
    if (statusLines.length) {
      summary.push('Known client signals:');
      statusLines.forEach(line => summary.push(`- ${line}`));
    }
    if (outstanding.length) {
      summary.push('Outstanding items to collect (in order):');
      outstanding.forEach(item => {
        summary.push(`- ${item}`);
      });
    }

    return `${basePrompt}

${summary.join('\n')}`;
  }

  async processMessage(message, context = {}, userId = 'default') {
    try {
      if (!this.chatHistory.has(userId)) {
        this.chatHistory.set(userId, []);
      }
      const history = this.chatHistory.get(userId);
      const userState = this.getUserState(userId);

      this.updateStateFromMessage(userState, message, context);

      // First response: greet without invoking the model
      if (!userState.hasGreeted) {
        history.push({ role: 'user', content: message });
        const greeting = 'Thank you for reaching out! How are you today?';
        history.push({ role: 'assistant', content: greeting });
        userState.hasGreeted = true;
        return {
          message: greeting,
          timestamp: new Date().toISOString(),
          context: null,
          suggestions: this.generateSuggestionsForState(userState)
        };
      }

      const serviceContext = await this.buildServiceContext(message, context, userState);
      const systemPrompt = this.buildSystemPrompt(userState);

      const messages = [{ role: 'system', content: systemPrompt }];
      if (serviceContext) {
        messages.push({ role: 'system', content: `Context for this user:
${serviceContext}` });
      }
      messages.push(...history.slice(-10));
      messages.push({ role: 'user', content: message });

      const response = await this.openai.responses.create({
        model: 'gpt-4.1-mini',
        input: messages,
        temperature: 0.4,
        max_output_tokens: 400
      });

      let aiResponse = (response.output_text || '').trim();
      aiResponse = this.enforceResponseRules(aiResponse, userState);

      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: aiResponse });

      return {
        message: aiResponse,
        timestamp: new Date().toISOString(),
        context: serviceContext,
        suggestions: this.generateSuggestionsForState(userState)
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  async buildServiceContext(message, context, userState) {
    const sections = [];

    if (context?.clientId) {
      try {
        const profile = await ClientProfileService.getClientProfile(context.clientId);
        const recentChats = await ClientProfileService.getClientChats(context.clientId);
        sections.push('Client profile from yachtsummary:');
        sections.push(`- Name: ${profile.name || 'Unknown'}`);
        if (profile.email) sections.push(`- Email: ${profile.email}`);
        if (profile.phone) sections.push(`- Phone: ${profile.phone}`);
        if (profile.preferences) sections.push(`- Preferences: ${profile.preferences}`);
        if (recentChats?.length) {
          const lastChat = recentChats[0];
          sections.push(`- Last inquiry: ${lastChat.summary || lastChat.message}`);
        }
      } catch (error) {
        console.warn('Client profile unavailable:', error.message);
      }
    }

    if (this.isDocumentQuery(message)) {
      try {
        const docResults = await DocumentService.searchDocuments(message);
        if (docResults.length > 0) {
          sections.push('Local document matches:');
          docResults.slice(0, 2).forEach(result => {
            sections.push(`- ${result.document.filename}: ${result.snippets[0] || 'Relevant section found.'}`);
          });
        }
      } catch (error) {
        console.warn('Local document search failed:', error.message);
      }

      try {
        const driveResults = await GoogleDriveService.searchDocuments(message);
        if (driveResults.length > 0) {
          sections.push('Google Drive matches:');
          driveResults.slice(0, 2).forEach(file => {
            sections.push(`- ${file.name} (${file.mimeType}) -> ${file.webViewLink}`);
          });
        }
      } catch (error) {
        console.warn('Drive search unavailable:', error.message);
      }
    }

    if (this.isYachtQuery(message) || userState.collected.yachtType || userState.collected.guests) {
      try {
        const availability = await YachtService.getAvailability({
          startDate: userState.plannedDates?.start,
          endDate: userState.plannedDates?.end,
          location: context?.location,
          yachtType: userState.yachtType
        });
        if (availability?.yachts?.length) {
          sections.push('Yacht recommendations:');
          availability.yachts.slice(0, 3).forEach(yacht => {
            sections.push(`- ${yacht.name} (${yacht.type}) • ${yacht.capacity} guests • ${yacht.price_per_day || yacht.weekly_rate}/day`);
          });
        }
      } catch (error) {
        console.warn('Yacht availability fallback:', error.message);
        const fallback = YachtService.getMockAvailability();
        if (fallback?.yachts?.length) {
          sections.push('Yacht recommendations (mock data):');
          fallback.yachts.slice(0, 2).forEach(yacht => {
            sections.push(`- ${yacht.name} (${yacht.type}) • ${yacht.capacity} guests • ${yacht.price_per_day}/day`);
          });
        }
      }
    }

    return sections.length ? sections.join('\n') : null;
  }

  isDocumentQuery(message) {
    const docKeywords = ['document', 'manual', 'file', 'pdf', 'search', 'find', 'look up', 'reference'];
    return docKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isYachtQuery(message) {
    const yachtKeywords = ['yacht', 'boat', 'charter', 'booking', 'availability', 'rent', 'cruise', 'catamaran', 'motor'];
    return yachtKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  enforceResponseRules(aiResponse, userState) {
    let response = aiResponse.trim();

    const needsConversion = this.shouldTriggerConversion(userState);
    if (needsConversion && !response.toLowerCase().startsWith('certainly')) {
      response = `Certainly ${response.charAt(0).toUpperCase()}${response.slice(1)}`;
      userState.conversionTriggered = true;
    }

    if (!needsConversion && response.toLowerCase().startsWith('certainly')) {
      response = response.replace(/^[Cc]ertainly[!,\.]?\s*/, 'Absolutely ');
    }

    // Ensure single question and short message guidance (trust model but enforce basic length)
    const wordCount = response.split(/\s+/).filter(Boolean).length;
    if (wordCount > 30) {
      response = response.split(/(?<=[.!?])/)[0];
    }

    return response.trim();
  }

  shouldTriggerConversion(userState) {
    return (
      userState.budgetMax &&
      userState.budgetMax >= 20000 &&
      !userState.conversionTriggered
    );
  }

  updateStateFromMessage(userState, message, context) {
    const lower = message.toLowerCase();

    const budgetInfo = this.extractBudgetInfo(message, context);
    if (budgetInfo?.maxBudget) {
      userState.budgetMax = Math.max(userState.budgetMax || 0, budgetInfo.maxBudget);
      userState.collected.budget = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'budget');
    }

    const guests = this.extractGuestCount(message);
    if (guests) {
      userState.guests = guests;
      userState.collected.guests = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'guests');
    }

    const yachtType = this.extractYachtType(message);
    if (yachtType) {
      userState.yachtType = yachtType;
      userState.collected.yachtType = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'yachtType');
    }

    const dates = this.extractDates(message);
    if (dates) {
      userState.plannedDates = dates;
      userState.collected.dates = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'dates');
    }

    const contact = this.extractContactDetails(message);
    if (contact.name) {
      userState.contact.name = contact.name;
      userState.collected.name = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'name');
    }
    if (contact.email) {
      userState.contact.email = contact.email;
      userState.collected.email = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'email');
    }
    if (contact.phone) {
      userState.contact.phone = contact.phone;
      userState.collected.phone = true;
      userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'phone');
    }

    if (lower.includes('buy') || lower.includes('purchase')) {
      userState.intent = 'purchase';
    }

    if (context?.url && !userState.collected.budget) {
      const pmax = this.extractBudgetFromUrl(context.url);
      if (pmax) {
        userState.budgetMax = Math.max(userState.budgetMax || 0, pmax);
        userState.collected.budget = true;
        userState.pendingQuestions = userState.pendingQuestions.filter(q => q !== 'budget');
      }
    }
  }

  extractBudgetFromUrl(url) {
    try {
      const params = new URL(url).searchParams;
      const pmax = params.get('pmax');
      if (pmax) {
        const value = Number(pmax);
        if (!Number.isNaN(value)) {
          return value;
        }
      }
    } catch (error) {
      const match = url.match(/pmax=(\d+)/i);
      if (match) {
        return Number(match[1]);
      }
    }
    return null;
  }

  extractBudgetInfo(message) {
    const cleaned = message.toLowerCase().replace(/grand/g, 'k');
    let maxBudget = null;

    const rangeRegex = /(\$?\d[\d,]*)(?:\s?(k|m|million))?\s*(?:-|to)\s*(\$?\d[\d,]*)(?:\s?(k|m|million))?/gi;
    let match;
    while ((match = rangeRegex.exec(cleaned)) !== null) {
      const first = this.normalizeBudgetValue(match[1], match[2]);
      const second = this.normalizeBudgetValue(match[3], match[4] || match[2]);
      const candidate = Math.max(first, second);
      if (!Number.isNaN(candidate)) {
        maxBudget = Math.max(maxBudget || 0, candidate);
      }
    }

    const singleRegex = /(over|under|around|about)?\s*\$?\d[\d,]*(?:\.\d+)?\s?(k|m|million)?/gi;
    while ((match = singleRegex.exec(cleaned)) !== null) {
      const value = this.normalizeBudgetValue(match[0]);
      if (!Number.isNaN(value)) {
        maxBudget = Math.max(maxBudget || 0, value);
      }
    }

    const wordRangeRegex = /(\d+[\d,]*)\s*(k)?\s*(?:\-|to)\s*(\d+[\d,]*)\s*(k)?/gi;
    while ((match = wordRangeRegex.exec(cleaned)) !== null) {
      const first = this.normalizeBudgetValue(match[1], match[2]);
      const second = this.normalizeBudgetValue(match[3], match[4] || match[2]);
      const candidate = Math.max(first, second);
      if (!Number.isNaN(candidate)) {
        maxBudget = Math.max(maxBudget || 0, candidate);
      }
    }

    if (maxBudget) {
      return { maxBudget };
    }
    return null;
  }

  normalizeBudgetValue(rawValue, unit) {
    const cleaned = rawValue.replace(/[^\d.]/g, '');
    let value = Number(cleaned);
    if (Number.isNaN(value)) return NaN;
    const suffix = unit || (rawValue.toLowerCase().includes('k') ? 'k' : rawValue.toLowerCase().includes('m') ? 'm' : null);
    if (suffix === 'k') value *= 1000;
    if (suffix === 'm' || suffix === 'million') value *= 1_000_000;
    return value;
  }

  extractGuestCount(message) {
    const match = message.toLowerCase().match(/(\d{1,2})\s*(guests?|people|pax|persons)/);
    if (match) {
      return Number(match[1]);
    }
    return null;
  }

  extractYachtType(message) {
    const lower = message.toLowerCase();
    if (/catamaran/.test(lower)) return 'catamaran';
    if (/motor/.test(lower)) return 'motor yacht';
    if (/sailing|sail/.test(lower)) return 'sailing yacht';
    if (/mega|super/.test(lower)) return 'superyacht';
    return null;
  }

  extractDates(message) {
    const rangeMatch = message.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(?:-|to|through)\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    if (rangeMatch) {
      return { start: rangeMatch[1], end: rangeMatch[2] };
    }
    const monthRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{1,2}/i;
    const match = message.match(monthRegex);
    if (match) {
      return { start: match[0], end: null };
    }
    return null;
  }

  extractContactDetails(message) {
    const contact = {};
    const emailMatch = message.match(/[\w.+-]+@[\w.-]+\.[\w.-]+/);
    if (emailMatch) {
      contact.email = emailMatch[0];
    }
    const phoneMatch = message.match(/\+?\d[\d\s().-]{7,}/);
    if (phoneMatch) {
      contact.phone = phoneMatch[0].trim();
    }
    const nameMatch = message.match(/(?:i am|i'm|this is)\s+([A-Z][a-z]+\s?[A-Z]?[a-z]*)/i);
    if (nameMatch) {
      contact.name = nameMatch[1].trim();
    }
    return contact;
  }

  generateSuggestionsForState(userState) {
    const suggestions = [];
    if (!userState.collected.dates) {
      suggestions.push('Let me share our travel dates.');
    } else if (!userState.collected.yachtType) {
      suggestions.push('We are thinking about a catamaran.');
    } else if (!userState.collected.guests) {
      suggestions.push('We expect 8 guests.');
    } else if (!userState.collected.email) {
      suggestions.push('Here is my email address.');
    } else if (!userState.collected.phone) {
      suggestions.push('I can be reached on WhatsApp at...');
    } else if (!userState.collected.budget) {
      suggestions.push('Our budget is around $30,000.');
    }
    return suggestions.slice(0, 3);
  }

  async getChatHistory(userId) {
    return this.chatHistory.get(userId) || [];
  }

  async clearChatHistory(userId) {
    this.chatHistory.delete(userId);
  }

  async getAgentCapabilities() {
    return {
      document_management: {
        search: 'Search through uploaded documents',
        retrieve: 'Get specific document content',
        analyze: 'Analyze document content'
      },
      yacht_services: {
        availability: 'Check yacht availability',
        details: 'Get yacht information',
        booking: 'Assist with booking process'
      },
      general_assistance: {
        chat: 'General conversation and Q&A',
        navigation: 'Help with using the system',
        support: 'Technical support and guidance'
      }
    };
  }

  async getAgentInsights(userId = 'default') {
    const state = this.getUserState(userId);
    const insights = {
      client: null,
      yachts: [],
      documents: []
    };

    if (state.contact?.email || state.contact?.phone || state.contact?.name) {
      insights.client = {
        name: state.contact.name,
        email: state.contact.email,
        phone: state.contact.phone,
        preferences: state.yachtType ? `Interested in ${state.yachtType}` : null,
        intent: state.intent
      };
    }

    if (state.yachtType || state.guests || state.budgetMax) {
      try {
        const availability = await YachtService.getAvailability({
          yachtType: state.yachtType,
          guests: state.guests,
          budget: state.budgetMax
        });
        const yachts = availability?.yachts || [];
        insights.yachts = yachts.slice(0, 3).map((yacht) => ({
          id: yacht.id,
          name: yacht.name,
          type: yacht.type,
          capacity: yacht.capacity,
          location: yacht.location,
          rate: yacht.price_per_day || yacht.weekly_rate
        }));
      } catch (error) {
        console.warn('Failed to build yacht insights:', error.message);
      }
    }

    if (state.pendingQuestions?.includes('budget') === false) {
      try {
        const query = state.yachtType || 'charter';
        const documents = await DocumentService.searchDocuments(query);
        const driveDocs = await GoogleDriveService.searchDocuments(query);
        const combined = [];

        documents.slice(0, 2).forEach((doc) => {
          combined.push({
            id: doc.document.id,
            title: doc.document.filename,
            snippet: doc.snippets[0] || 'Relevant details found in manual.'
          });
        });

        driveDocs.slice(0, 2).forEach((doc) => {
          combined.push({
            id: doc.id,
            title: doc.name,
            snippet: doc.snippet || doc.mimeType,
            link: doc.webViewLink
          });
        });
        insights.documents = combined;
      } catch (error) {
        console.warn('Failed to gather document insights:', error.message);
      }
    }

    return insights;
  }
}

module.exports = new ChatService();
