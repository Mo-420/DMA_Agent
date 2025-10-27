const OpenAI = require('openai');

class EmailDraftService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async createDraft({ client, yachts, context, tone = 'professional' }) {
    const prompt = this.buildPrompt({ client, yachts, context, tone });
    const response = await this.openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt,
      temperature: 0.4,
      max_output_tokens: 400
    });

    return {
      email: response.output_text || '',
      generatedAt: new Date().toISOString()
    };
  }

  buildPrompt({ client = {}, yachts = [], context = '', tone }) {
    const yachtList = yachts.map((yacht, index) => (
      `${index + 1}. ${yacht.name || 'Unnamed'} – ${yacht.type || 'yacht'} for ${yacht.capacity || 'N/A'} guests (${yacht.rate || 'rate on request'})`
    )).join('\n');

    return `Compose a ${tone} follow-up email from Rachel Hoffman at DMA Yachting to a charter prospect.

Client details:
${JSON.stringify(client, null, 2)}

Recommended yachts:
${yachtList || 'No yachts yet; ask for requirements.'}

Additional context:
${context || 'N/A'}

Email requirements:
- Friendly, concise, human tone
- Reinforce next steps and how to reach brokers
- Mention that a senior broker will reach out soon`; 
  }
}

module.exports = new EmailDraftService();



