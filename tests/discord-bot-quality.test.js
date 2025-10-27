const OpenAI = require('openai');
const DiscordBotService = require('../server/services/DiscordBotService');
const GoogleDriveService = require('../server/services/GoogleDriveService');
const fs = require('fs');
const path = require('path');

async function ensureManualLoaded() {
  console.log('Initializing Google Drive Service...');
  
  // Manually initialize Google Drive if using service account
  if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH && !GoogleDriveService.isReady) {
    const { google } = require('googleapis');
    const serviceAccount = require(process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    
    GoogleDriveService.drive = google.drive({ version: 'v3', auth });
    GoogleDriveService.isReady = true;
    GoogleDriveService.oauth2Client = auth;
    console.log('✓ Google Drive Service initialized with service account');
  }
  
  // Trigger manual loading in DiscordBotService
  if (process.env.DMA_MANUAL_GOOGLE_DOC_ID) {
    console.log('Loading manual content for testing...');
    await DiscordBotService.loadManualContent();
    console.log(`Manual loaded: ${DiscordBotService.manualContent ? 'Yes' : 'No'}`);
    console.log(`Sections: ${DiscordBotService.manualSections?.length || 0}`);
  }
}

class QualityTestSuite {
  constructor() {
    this.openai = null;
    this.testQuestions = [
      'What are the safety procedures for yacht operations?',
      'How do I book a yacht charter?',
      'What is the APA (Advance Provisioning Allowance)?',
      'What documentation is required for yacht charters?',
      'What are the maintenance requirements for yachts?',
      'How do I handle emergency situations on a yacht?',
      'What is included in a yacht charter?',
      'How do crew gratuities work?',
      'What are the cancellation policies?',
      'How do I contact DMA Yachting for support?',
      'What yacht types are available?',
      'What is the booking process?',
      'Are there age restrictions for yacht charters?',
      'What equipment is typically included on yachts?',
      'How do dietary restrictions work on charters?'
    ];
    this.results = [];
  }

  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.openai;
  }

  async getMoGPTResponse(question, context) {
    try {
      // Try to use custom GPT via Assistants API if configured
      if (process.env.CUSTOM_GPT_ASSISTANT_ID) {
        console.log(`Using custom GPT assistant: ${process.env.CUSTOM_GPT_ASSISTANT_ID}`);
        
        const assistant = this.getOpenAI().beta.assistants.retrieve(process.env.CUSTOM_GPT_ASSISTANT_ID);
        
        // Create a thread
        const thread = await this.getOpenAI().beta.threads.create();
        
        // Add message to thread
        await this.getOpenAI().beta.threads.messages.create(thread.id, {
          role: 'user',
          content: question
        });
        
        // Run the assistant
        const run = await this.getOpenAI().beta.threads.runs.create(thread.id, {
          assistant_id: process.env.CUSTOM_GPT_ASSISTANT_ID
        });
        
        // Wait for completion
        let runStatus = await this.getOpenAI().beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await this.getOpenAI().beta.threads.runs.retrieve(thread.id, run.id);
        }
        
        // Get messages
        const messages = await this.getOpenAI().beta.threads.messages.list(thread.id);
        const response = messages.data[0].content[0].text.value;
        
        return response.trim();
      }
      
      // Fallback to regular chat completion
      const messages = [
        {
          role: 'system',
          content: 'You are an expert assistant answering questions about yacht charters and maritime operations. Be thorough, accurate, and professional.'
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ];

      const completion = await this.getOpenAI().chat.completions.create({
        model: process.env.MOGPT_MODEL || 'gpt-4o',
        messages: messages,
        temperature: 0.7
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error getting MoGPT response:', error);
      return null;
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.getOpenAI().embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async runTests() {
    console.log('Starting quality comparison tests...\n');
    
    // Ensure manual is loaded
    await ensureManualLoaded();
    
    for (let i = 0; i < this.testQuestions.length; i++) {
      const question = this.testQuestions[i];
      console.log(`Test ${i + 1}/${this.testQuestions.length}: ${question}`);
      
      const startTime = Date.now();
      
      // Get bot response
      const botResponse = await DiscordBotService.generateResponse(question);
      const botTime = Date.now() - startTime;
      
      // Get manual sections for MoGPT context
      const relevantSections = DiscordBotService.findRelevantSections && typeof DiscordBotService.findRelevantSections === 'function' ? 
        DiscordBotService.findRelevantSections(question, 3).join('\n\n') : '';
      
      // Get MoGPT response
      const mogptStartTime = Date.now();
      const mogptResponse = await this.getMoGPTResponse(question, relevantSections);
      const mogptTime = Date.now() - mogptStartTime;
      
      // Generate embeddings and calculate similarity
      let similarity = 0;
      if (botResponse && mogptResponse) {
        const botEmbedding = await this.generateEmbedding(botResponse);
        const mogptEmbedding = await this.generateEmbedding(mogptResponse);
        
        if (botEmbedding && mogptEmbedding) {
          similarity = this.cosineSimilarity(botEmbedding, mogptEmbedding);
        }
      }
      
      const result = {
        question,
        botResponse,
        mogptResponse,
        similarity,
        botTime: `${botTime}ms`,
        mogptTime: `${mogptTime}ms`,
        needsReview: similarity < 0.85
      };
      
      this.results.push(result);
      
      console.log(`  Similarity: ${similarity.toFixed(3)} ${similarity < 0.85 ? '⚠️  Needs Review' : '✓'}\n`);
    }
    
    this.generateReport();
  }

  generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(__dirname, 'quality-reports', `report-${timestamp}.md`);
    
    const avgSimilarity = this.results.reduce((sum, r) => sum + r.similarity, 0) / this.results.length;
    const needsReview = this.results.filter(r => r.needsReview).length;
    
    let report = `# Discord Bot Quality Test Report\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    report += `**Summary:**\n`;
    report += `- Total Tests: ${this.results.length}\n`;
    report += `- Average Similarity: ${avgSimilarity.toFixed(3)}\n`;
    report += `- Needs Review: ${needsReview} (${((needsReview / this.results.length) * 100).toFixed(1)}%)\n\n`;
    report += `---\n\n`;
    
    this.results.forEach((result, index) => {
      report += `## Test ${index + 1}: ${result.question}\n\n`;
      report += `**Similarity Score:** ${result.similarity.toFixed(3)} ${result.needsReview ? '⚠️  Needs Review' : '✓'}\n\n`;
      report += `**Bot Response Time:** ${result.botTime}\n`;
      report += `**MoGPT Response Time:** ${result.mogptTime}\n\n`;
      report += `### Bot Response:\n${result.botResponse}\n\n`;
      report += `### MoGPT Response:\n${result.mogptResponse}\n\n`;
      report += `---\n\n`;
    });
    
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n✓ Test complete. Report saved to: ${reportPath}`);
    console.log(`  Average Similarity: ${avgSimilarity.toFixed(3)}`);
    console.log(`  Tests Needing Review: ${needsReview}/${this.results.length}`);
  }
}

// Run tests if executed directly
if (require.main === module) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  // Check if OpenAI key is loaded
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not found in .env file');
    process.exit(1);
  }
  
  console.log('✓ Environment variables loaded');
  console.log(`✓ OpenAI API Key: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
  
  const suite = new QualityTestSuite();
  suite.runTests().catch(console.error);
}

module.exports = QualityTestSuite;
