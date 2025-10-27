const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const OpenAI = require('openai');

class DocumentService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.documentsDir = process.env.DOCUMENTS_DIR || './documents';
    this.documents = new Map();
    this.initializeDocuments();
  }

  async initializeDocuments() {
    try {
      await fs.mkdir(this.documentsDir, { recursive: true });
      await this.loadExistingDocuments();
    } catch (error) {
      console.error('Error initializing documents:', error);
    }
  }

  async loadExistingDocuments() {
    try {
      const files = await fs.readdir(this.documentsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.documentsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const document = JSON.parse(content);
          this.documents.set(document.id, document);
        }
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  }

  async getAllDocuments() {
    return Array.from(this.documents.values());
  }

  async getDocument(id) {
    return this.documents.get(id);
  }

  async searchDocuments(query, filters = {}) {
    const results = [];
    
    for (const [id, document] of this.documents) {
      if (this.matchesFilters(document, filters)) {
        const relevance = await this.calculateRelevance(document, query);
        if (relevance > 0) {
          results.push({
            document,
            relevance,
            snippets: await this.extractRelevantSnippets(document, query)
          });
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  async uploadDocument(file, metadata = {}) {
    const id = this.generateId();
    const document = {
      id,
      filename: file.originalname,
      uploadDate: new Date().toISOString(),
      metadata,
      content: '',
      embeddings: null
    };

    // Extract text content based on file type
    document.content = await this.extractTextContent(file);
    
    // Generate embeddings for semantic search
    document.embeddings = await this.generateEmbeddings(document.content);

    // Save document
    this.documents.set(id, document);
    await this.saveDocument(document);

    return document;
  }

  async extractTextContent(file) {
    const buffer = file.buffer;
    const extension = path.extname(file.originalname).toLowerCase();

    switch (extension) {
      case '.pdf':
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
      
      case '.docx':
        const docxResult = await mammoth.extractRawText({ buffer });
        return docxResult.value;
      
      case '.html':
      case '.htm':
        const html = buffer.toString('utf8');
        const $ = cheerio.load(html);
        return $('body').text();
      
      case '.txt':
        return buffer.toString('utf8');
      
      default:
        return buffer.toString('utf8');
    }
  }

  async generateEmbeddings(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return null;
    }
  }

  async calculateRelevance(document, query) {
    if (!document.embeddings) return 0;

    try {
      const queryEmbedding = await this.generateEmbeddings(query);
      if (!queryEmbedding) return 0;

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(document.embeddings, queryEmbedding);
      return similarity;
    } catch (error) {
      console.error('Error calculating relevance:', error);
      return 0;
    }
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async extractRelevantSnippets(document, query, maxSnippets = 3) {
    const sentences = document.content.split(/[.!?]+/);
    const snippets = [];

    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(query.toLowerCase())) {
        snippets.push(sentence.trim());
        if (snippets.length >= maxSnippets) break;
      }
    }

    return snippets;
  }

  matchesFilters(document, filters) {
    if (filters.type && document.metadata.type !== filters.type) return false;
    if (filters.dateFrom && new Date(document.uploadDate) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(document.uploadDate) > new Date(filters.dateTo)) return false;
    return true;
  }

  async updateDocument(id, updates) {
    const document = this.documents.get(id);
    if (!document) throw new Error('Document not found');

    Object.assign(document, updates);
    document.lastModified = new Date().toISOString();

    await this.saveDocument(document);
    return document;
  }

  async deleteDocument(id) {
    const document = this.documents.get(id);
    if (!document) throw new Error('Document not found');

    this.documents.delete(id);
    const filePath = path.join(this.documentsDir, `${id}.json`);
    await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
  }

  async saveDocument(document) {
    const filePath = path.join(this.documentsDir, `${document.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(document, null, 2));
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = new DocumentService();

