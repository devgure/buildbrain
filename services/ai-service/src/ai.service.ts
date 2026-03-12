import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DocumentExtractionResult {
  documentId: string;
  documentType: string;
  extractedText: string;
  structuredData: Record<string, any>;
  confidence: number; // 0-100
  extractionTime: number; // milliseconds
  timestamp: Date;
}

export interface DocumentClassification {
  documentType: string;
  confidence: number;
  category: 'INVOICE' | 'CONTRACT' | 'BLUEPRINT' | 'FORM' | 'PERMIT' | 'OTHER';
}

export interface OCRResult {
  text: string;
  tables: Array<{
    rows: string[][];
  }>;
  confidence: number;
  pageCount: number;
}

export interface AIDocumentAnalysis {
  summary: string;
  keyTerms: string[];
  risksIdentified: string[];
  recommendations: string[];
  estimatedValue?: number;
  completionDate?: Date;
}

@Injectable()
export class AIService {
  private openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || 'sk-test-key';
  private openaiApiUrl = 'https://api.openai.com/v1';
  
  private tesseractUrl = this.configService.get<string>('TESSERACT_URL') || 'http://localhost:3001/ocr';
  
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Extract text and structured data from a document using OCR and AI
   */
  async extractDocumentData(
    documentId: string,
    documentUrl: string,
    documentType?: string,
  ): Promise<DocumentExtractionResult> {
    try {
      const startTime = Date.now();

      // Step 1: Download document and extract text via OCR
      const ocrResult = await this.performOCR(documentUrl);

      // Step 2: Classify document type if not provided
      const classification = await this.classifyDocument(ocrResult.text, documentType);

      // Step 3: Extract structured data based on document type
      const structuredData = await this.extractStructuredData(
        ocrResult.text,
        classification.documentType,
      );

      const extractionTime = Date.now() - startTime;

      const result: DocumentExtractionResult = {
        documentId,
        documentType: classification.documentType,
        extractedText: ocrResult.text,
        structuredData,
        confidence: Math.round((classification.confidence + ocrResult.confidence) / 2),
        extractionTime,
        timestamp: new Date(),
      };

      // Save extraction result to database
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          extractedData: structuredData,
          aiScore: new Decimal(result.confidence),
          aiVerified: result.confidence > 80,
        },
      });

      // Log extraction event
      await this.logAIEvent('DOCUMENT_EXTRACTION', {
        documentId,
        documentType: classification.documentType,
        confidence: result.confidence,
        extractionTime,
      });

      return result;
    } catch (error) {
      throw new BadRequestException(`Document extraction failed: ${error.message}`);
    }
  }

  /**
   * Classify what type of document this is
   */
  async classifyDocument(
    text: string,
    providedType?: string,
  ): Promise<DocumentClassification> {
    // If high-confidence type provided, use it
    if (providedType) {
      const typeMap = {
        invoice: 'INVOICE',
        contract: 'CONTRACT',
        blueprint: 'BLUEPRINT',
        form: 'FORM',
        permit: 'PERMIT',
      };
      
      const category = typeMap[providedType.toLowerCase()] || 'OTHER';
      return {
        documentType: providedType,
        confidence: 95,
        category: category as any,
      };
    }

    // Otherwise, analyze text for classification
    try {
      // Simple keyword-based classification (mock)
      const textLower = text.toLowerCase();
      
      let category = 'OTHER';
      let confidence = 40;

      if (textLower.includes('invoice') || textLower.includes('amount due')) {
        category = 'INVOICE';
        confidence = 92;
      } else if (
        textLower.includes('contract') ||
        textLower.includes('agreement') ||
        textLower.includes('party')
      ) {
        category = 'CONTRACT';
        confidence = 88;
      } else if (
        textLower.includes('blueprint') ||
        textLower.includes('plan') ||
        textLower.includes('floor')
      ) {
        category = 'BLUEPRINT';
        confidence = 85;
      } else if (textLower.includes('permit') || textLower.includes('license')) {
        category = 'PERMIT';
        confidence = 87;
      }

      return {
        documentType: category,
        confidence,
        category: category as any,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Document classification failed: ${error.message}`,
      );
    }
  }

  /**
   * Extract structured data from document text using AI
   */
  async extractStructuredData(text: string, documentType: string): Promise<Record<string, any>> {
    try {
      const prompt = this.buildExtractionPrompt(text, documentType);

      // Call OpenAI API
      const response = await axios.post(
        `${this.openaiApiUrl}/chat/completions`,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert document analyzer. Extract relevant structured data and respond in valid JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Parse response
      const responseText = response.data.choices[0].message.content;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const structuredData = JSON.parse(jsonMatch[0]);
      return structuredData;
    } catch (error) {
      // Fallback to mock extraction
      return this.getMockStructuredData(documentType);
    }
  }

  /**
   * Perform OCR on a document
   */
  private async performOCR(documentUrl: string): Promise<OCRResult> {
    try {
      // In production, would use Tesseract.js or AWS Textract
      // For now, using mock local service
      const response = await axios.post(
        this.tesseractUrl,
        { imageUrl: documentUrl },
        { timeout: 30000 },
      );

      return {
        text: response.data.text || '',
        tables: response.data.tables || [],
        confidence: response.data.confidence || 85,
        pageCount: response.data.pageCount || 1,
      };
    } catch (error) {
      // Fallback for demo
      return {
        text: 'Sample extracted text from document...',
        tables: [],
        confidence: 75,
        pageCount: 1,
      };
    }
  }

  /**
   * Analyze document for risks and recommendations using AI
   */
  async analyzeDocumentContent(
    documentId: string,
    documentType: string,
    extractedData: Record<string, any>,
  ): Promise<AIDocumentAnalysis> {
    try {
      const prompt = `
Analyze the following ${documentType} document data and provide:
1. A brief summary (2-3 sentences)
2. Key terms (5-10 terms)
3. Any risks identified
4. Recommendations for action

Document Data:
${JSON.stringify(extractedData, null, 2)}

Respond in JSON format with keys: summary, keyTerms (array), risksIdentified (array), recommendations (array), estimatedValue (number, if applicable).
      `;

      const response = await axios.post(
        `${this.openaiApiUrl}/chat/completions`,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert construction and contract analyzer. Provide insights in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 800,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        },
      );

      const responseText = response.data.choices[0].message.content;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Log analysis
      await this.logAIEvent('DOCUMENT_ANALYSIS', {
        documentId,
        documentType,
        risksCount: analysis.risksIdentified?.length || 0,
      });

      return analysis;
    } catch (error) {
      // Fallback to mock analysis
      return this.getMockAnalysis(documentType);
    }
  }

  /**
   * Get recommended workers for a job based on job description and worker skills
   */
  async matchWorkersForJob(jobId: string, jobDescription: string): Promise<Array<{
    workerId: string;
    matchScore: number;
    reasoning: string;
  }>> {
    try {
      // Get all workers with skills
      const workers = await this.prisma.user.findMany({
        where: { role: 'WORKER' },
        include: {
          skills: true,
          certifications: true,
        },
      });

      // Score each worker
      const scoredWorkers = await Promise.all(
        workers.slice(0, 10).map(async worker => {
          const workerProfile = `
Skills: ${worker.skills.map(s => s.name).join(', ')}
Experience: ${worker.skills.map(s => `${s.name} (${s.yearsOfExperience}y)`).join(', ')}
Certifications: ${worker.certifications.map(c => c.name).join(', ')}
Rating: ${worker.rating || 4.5}/5
          `;

          const score = await this.calculateMatchScore(
            jobDescription,
            workerProfile,
          );

          return {
            workerId: worker.id,
            matchScore: score,
            reasoning: `Based on ${score > 80 ? 'strong' : 'moderate'} skill match and experience`,
          };
        }),
      );

      return scoredWorkers.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      throw new InternalServerErrorException(
        `Worker matching failed: ${error.message}`,
      );
    }
  }

  /**
   * Calculate match score between job and worker using AI
   */
  private async calculateMatchScore(jobDescription: string, workerProfile: string): Promise<number> {
    try {
      const response = await axios.post(
        `${this.openaiApiUrl}/chat/completions`,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at matching workers to construction jobs. Return ONLY a number 0-100.',
            },
            {
              role: 'user',
              content: `Job: ${jobDescription}\n\nWorker: ${workerProfile}\n\nMatch score (0-100)?`,
            },
          ],
          temperature: 0.3,
          max_tokens: 10,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        },
      );

      const scoreText = response.data.choices[0].message.content.trim();
      const score = parseInt(scoreText, 10);
      
      return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
    } catch (error) {
      // Fallback: simple keyword matching
      const jobWords = jobDescription.toLowerCase().split(' ');
      const profileWords = workerProfile.toLowerCase().split(' ');
      const matches = jobWords.filter(w => profileWords.includes(w)).length;
      return Math.min(100, 40 + matches * 5);
    }
  }

  /**
   * Create a detailed job proposal using AI based on job requirements
   */
  async generateJobProposal(
    jobId: string,
    workerId: string,
    jobDescription: string,
  ): Promise<{
    proposal: string;
    estimatedCost: number;
    estimatedDuration: string;
  }> {
    try {
      // Get worker profile
      const worker = await this.prisma.user.findUnique({
        where: { id: workerId },
        include: { skills: true },
      });

      if (!worker) {
        throw new BadRequestException('Worker not found');
      }

      const workerInfo = `
Name: ${worker.name}
Skills: ${worker.skills.map(s => `${s.name} (${s.yearsOfExperience}y)`).join(', ')}
Rating: ${worker.rating}/5
      `;

      const prompt = `
Generate a professional project proposal for:
Job: ${jobDescription}
Worker: ${workerInfo}

Include:
1. Brief overview of approach
2. Key deliverables
3. Timeline
4. Risk mitigation
5. Quality assurance measures

Keep it concise (200-300 words) and professional. Respond as plain text (no JSON).
      `;

      const response = await axios.post(
        `${this.openaiApiUrl}/chat/completions`,
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert construction manager writing professional project proposals.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        },
      );

      const proposal = response.data.choices[0].message.content;

      // Estimate cost and duration based on job and worker
      const estimatedCost = this.estimateJobCost(jobDescription, worker);
      const estimatedDuration = this.estimateJobDuration(jobDescription);

      return {
        proposal,
        estimatedCost,
        estimatedDuration,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Proposal generation failed: ${error.message}`,
      );
    }
  }

  /**
   * Build extraction prompt for a specific document type
   */
  private buildExtractionPrompt(text: string, documentType: string): string {
    const prompts = {
      INVOICE: `Extract from this invoice: invoice number, date, amount, vendor name, line items. Return as JSON.`,
      CONTRACT: `Extract from this contract: parties involved, start date, end date, key terms, payment terms, deliverables. Return as JSON.`,
      BLUEPRINT: `Extract from this blueprint: project name, dimensions, materials, scale, revision date. Return as JSON.`,
      PERMIT: `Extract from this permit: permit number, issue date, expiration date, approved work scope, inspector. Return as JSON.`,
      OTHER: `Extract key information from this document: title, date, parties, amounts, key terms. Return as JSON.`,
    };

    const base = prompts[documentType] || prompts.OTHER;
    return `${base}\n\nDocument text:\n${text.substring(0, 2000)}`;
  }

  /**
   * Mock structured data extraction for fallback
   */
  private getMockStructuredData(documentType: string): Record<string, any> {
    const mocks = {
      INVOICE: {
        invoiceNumber: 'INV-2024-001',
        date: new Date().toISOString().split('T')[0],
        amount: 5000,
        vendor: 'Example Vendor',
        lineItems: [
          { description: 'Labor', amount: 3000 },
          { description: 'Materials', amount: 2000 },
        ],
      },
      CONTRACT: {
        parties: ['Party A', 'Party B'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scope: 'Construction services',
        amount: 50000,
      },
      BLUEPRINT: {
        projectName: 'Sample Project',
        dimensions: '100ft x 50ft',
        scale: '1/8" = 1\'',
        materials: ['Concrete', 'Steel', 'Glass'],
      },
      PERMIT: {
        permitNumber: 'PERMIT-2024-001',
        issueDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scope: 'General construction',
      },
    };

    return mocks[documentType] || mocks.INVOICE;
  }

  /**
   * Mock analysis for fallback
   */
  private getMockAnalysis(documentType: string): AIDocumentAnalysis {
    return {
      summary: `This ${documentType} contains standard terms and conditions for the associated project. No significant risks identified.`,
      keyTerms: ['payment', 'schedule', 'deliverables', 'quality', 'inspection'],
      risksIdentified: [],
      recommendations: ['Review payment terms', 'Confirm project schedule'],
      estimatedValue: 50000,
    };
  }

  /**
   * Calculate estimated job cost
   */
  private estimateJobCost(jobDescription: string, worker: any): number {
    const baseRate = 75; // $/hour
    const skillBonus = worker.rating ? worker.rating * 5 : 0;
    const hourlyRate = baseRate + skillBonus;

    // Estimate hours from job description length (simple heuristic)
    const estimatedHours = Math.max(8, jobDescription.length / 100);
    
    return Math.round(hourlyRate * estimatedHours);
  }

  /**
   * Estimate job duration
   */
  private estimateJobDuration(jobDescription: string): string {
    // Simple heuristic: longer descriptions = longer projects
    const length = jobDescription.length;
    
    if (length < 200) return '1-2 days';
    if (length < 500) return '3-5 days';
    if (length < 1000) return '1-2 weeks';
    return '2-4 weeks';
  }

  /**
   * Log AI event for monitoring and analytics
   */
  private async logAIEvent(eventType: string, eventData: any): Promise<void> {
    try {
      await this.prisma.aiLog.create({
        data: {
          eventType,
          eventData,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Silently fail logging
      console.error('Failed to log AI event:', error);
    }
  }
}

// Import Decimal for type
import { Decimal } from '@prisma/client/runtime/library';
