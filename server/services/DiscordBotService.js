const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');
const GoogleDriveService = require('./GoogleDriveService');

class DiscordBotService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.openai = null;
    this.manualContent = null;
    this.manualSections = [];
  }
  
  getOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.openai;
  }

  async initialize() {
    try {
      if (!process.env.DISCORD_BOT_TOKEN) {
        console.warn('Discord bot token not configured');
        return;
      }

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      this.client.once('ready', () => {
        console.log('Discord bot is ready!');
        this.isReady = true;
      });

      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      await this.registerCommands();

      // Load manual content
      await this.loadManualContent();
    } catch (error) {
      console.error('Error initializing Discord bot:', error);
    }
  }

  async loadManualContent() {
    try {
      if (!process.env.DMA_MANUAL_GOOGLE_DOC_ID) {
        console.warn('DMA manual Google Doc ID not configured');
        return;
      }

      console.log('Attempting to load DMA manual from Google Drive...');
      
      // Wait for GoogleDriveService to be ready
      let attempts = 0;
      while (!GoogleDriveService.isReady && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!GoogleDriveService.isReady) {
        console.warn('GoogleDriveService not ready after 5 seconds');
        return;
      }
      
      const content = await GoogleDriveService.getFileContent(process.env.DMA_MANUAL_GOOGLE_DOC_ID);
      this.manualContent = content.content;
      
      // Chunk manual into sections for better retrieval
      this.manualSections = this.chunkIntoParagraphs(this.manualContent);
      
      console.log(`✓ Loaded DMA manual with ${this.manualSections.length} sections`);
      console.log(`First 200 chars: ${this.manualContent.substring(0, 200)}...`);
    } catch (error) {
      console.error('✗ Error loading manual content:', error.message);
      console.log('The bot will still work, but responses may be less accurate.');
      console.log('To fix: Configure Google Drive API credentials in .env file');
    }
  }

  chunkIntoParagraphs(text) {
    // Split by paragraphs (double newlines)
    const chunks = text.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 0);
    return chunks;
  }

  findRelevantSections(query, limit = 3) {
    if (!this.manualSections.length) return [];
    
    const queryLower = query.toLowerCase();
    
    // Simple keyword-based matching (can be improved with embeddings)
    const scoredSections = this.manualSections.map((section, index) => {
      const sectionLower = section.toLowerCase();
      const queryWords = queryLower.split(/\s+/);
      const score = queryWords.reduce((acc, word) => {
        if (sectionLower.includes(word)) {
          return acc + (sectionLower.match(new RegExp(word, 'g')) || []).length;
        }
        return acc;
      }, 0);
      
      return { section, index, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scoredSections.map(item => item.section);
  }

  async generateResponse(question) {
    try {
      // Find relevant sections from manual
      let relevantSections = [];
      let context = '';
      
      if (this.manualSections && this.manualSections.length > 0) {
        relevantSections = this.findRelevantSections(question);
        context = relevantSections.join('\n\n---\n\n');
      } else {
        console.log('Manual not loaded - using general knowledge mode');
        context = '[Manual not currently loaded. Answer based on general yacht charter knowledge.]';
      }

      const systemPrompt = `You are a helpful assistant for DMA Yachting, answering questions about the DMA Yachting manual.

Your responses should:
- Be professional, knowledgeable, and helpful
- Reference specific sections/chapters when available
- Use yacht-specific terminology correctly
- Be concise but complete
- If you don't have information in the manual, acknowledge this clearly
- Suggest contacting DMA Yachting team for complex queries

Provide responses in this format:
[Direct Answer]

📖 Source: [Section/Chapter if applicable]

[Additional context if helpful]

Format your response naturally without the brackets.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Manual Context:\n\n${context}\n\nQuestion: ${question}` }
      ];

      const completion = await this.getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 500,
        presence_penalty: 0.1,
        frequency_penalty: 0.2
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating response:', error);
      return 'I apologize, but I encountered an error processing your question. Please try again.';
    }
  }

  async registerCommands() {
    try {
      if (!this.client || !this.isReady) {
        console.log('Waiting for Discord client to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

      const commands = [
        new SlashCommandBuilder()
          .setName('ask')
          .setDescription('Ask a question about the DMA manual')
          .addStringOption(option =>
            option.setName('question')
              .setDescription('Your question about the DMA manual')
              .setRequired(true)
          )
          .toJSON(),
        new SlashCommandBuilder()
          .setName('manual-search')
          .setDescription('Search for specific information in the manual')
          .addStringOption(option =>
            option.setName('query')
              .setDescription('Search term')
              .setRequired(true)
          )
          .toJSON(),
        new SlashCommandBuilder()
          .setName('help')
          .setDescription('Get help with the DMA bot')
          .toJSON()
      ];

      if (process.env.DISCORD_GUILD_ID) {
        // Register commands for specific guild
        await rest.put(
          Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
          { body: commands }
        );
        console.log('Registered guild slash commands');
      } else {
        // Register global commands
        await rest.put(
          Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
          { body: commands }
        );
        console.log('Registered global slash commands');
      }

      // Handle slash commands
      this.client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        try {
          await interaction.deferReply();

          if (interaction.commandName === 'ask') {
            const question = interaction.options.getString('question');
            const response = await this.generateResponse(question);

            const embed = new EmbedBuilder()
              .setTitle('DMA Manual Answer')
              .setDescription(response)
              .setColor(0x0099FF)
              .setFooter({ text: 'DMA Yachting Manual Bot' })
              .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
          } else if (interaction.commandName === 'manual-search') {
            const query = interaction.options.getString('query');
            const sections = this.findRelevantSections(query, 5);

            if (sections.length === 0) {
              await interaction.editReply('No relevant sections found in the manual.');
            } else {
              const content = sections.slice(0, 3).map((section, i) => 
                `**Section ${i + 1}:**\n${section.substring(0, 500)}...`
              ).join('\n\n');

              const embed = new EmbedBuilder()
                .setTitle(`Search Results: "${query}"`)
                .setDescription(content)
                .setColor(0x0099FF)
                .setFooter({ text: `Found ${sections.length} relevant sections` })
                .setTimestamp();

              await interaction.editReply({ embeds: [embed] });
            }
          } else if (interaction.commandName === 'help') {
            const helpEmbed = new EmbedBuilder()
              .setTitle('DMA Manual Bot Help')
              .setDescription('I can help you find information in the DMA Yachting manual.')
              .addFields(
                { name: '/ask', value: 'Ask a question about the DMA manual' },
                { name: '/manual-search', value: 'Search for specific information in the manual' },
                { name: '/help', value: 'Show this help message' }
              )
              .setColor(0x0099FF)
              .setFooter({ text: 'DMA Yachting Manual Bot' })
              .setTimestamp();

            await interaction.editReply({ embeds: [helpEmbed] });
          }
        } catch (error) {
          console.error('Error handling interaction:', error);
          await interaction.editReply('An error occurred while processing your request.');
        }
      });

    } catch (error) {
      console.error('Error registering commands:', error);
    }
  }

  async getStats() {
    return {
      isReady: this.isReady,
      manualLoaded: this.manualContent !== null,
      sectionsCount: this.manualSections.length
    };
  }
}

module.exports = new DiscordBotService();
