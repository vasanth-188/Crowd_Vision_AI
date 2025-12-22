import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrowdAnalysis, MissingPersonResult } from "../types";

/**
 * CrowdAnalysisService
 * 
 * Provides AI-powered crowd analysis capabilities including:
 * - Real-time crowd headcount and density estimation
 * - Safety capacity recommendations
 * - Predictive alerts for dangerous crowd situations
 * - Missing person identification and location tracking
 * 
 * Uses advanced computer vision and machine learning models
 * for accurate and reliable crowd safety assessment.
 */
export class CrowdAnalysisService {
  private ai: GoogleGenAI;

  /**
   * Initialize the crowd analysis service with API credentials
   * @throws {Error} If API key is not configured
   */
  constructor() {
    const apiKey = import.meta.env.VITE_VISION_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error(
        'Vision API key is not configured.\n\n' +
        'Setup Instructions:\n' +
        '1. Copy .env.example to .env (if not already done)\n' +
        '2. Edit .env file and add your Vision API key\n' +
        '3. Get your API key from: https://aistudio.google.com/apikey\n' +
        '4. Restart the development server\n\n' +
        'Current value in .env: ' + (apiKey ? 'placeholder (needs real key)' : 'not set')
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Analyze crowd composition and safety metrics from a video frame
   * 
   * @param frameBase64 - Base64 encoded image frame
   * @param venueArea - Total venue area in square meters
   * @returns Detailed crowd analysis with safety metrics and recommendations
   */
  async analyzeCrowd(
    frameBase64: string, 
    venueArea: number
  ): Promise<CrowdAnalysis> {
    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'models/gemini-2.0-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: frameBase64,
            },
          },
          {
            text: `Analyze this crowd scene for safety. Venue total area is ${venueArea} square meters. 
            Provide a realistic headcount, density calculation, safety capacity recommendation, and risk assessment.
            Also, predict if a stampede or severe congestion might occur based on movement patterns.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headcount: { type: Type.INTEGER },
            density: { type: Type.NUMBER, description: "People per square meter" },
            maxCapacity: { type: Type.INTEGER },
            riskLevel: { type: Type.STRING, enum: ["Low", "Moderate", "High", "Critical"] },
            predictiveAlert: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["headcount", "density", "maxCapacity", "riskLevel", "recommendations"]
        }
      }
    });

    // Fixed: The .text property is a getter that returns the extracted string, not a method
    const text = response.text || '{}';
    return JSON.parse(text.trim()) as CrowdAnalysis;
  }

  /**
   * Detect and locate a missing person within a crowd
   * 
   * @param crowdFrameBase64 - Base64 encoded image of the crowd
   * @param targetPersonBase64 - Base64 encoded reference image of the missing person
   * @returns Detection results with confidence score and location information
   */
  async findMissingPerson(
    crowdFrameBase64: string,
    targetPersonBase64: string
  ): Promise<MissingPersonResult> {
    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'models/gemini-2.0-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: crowdFrameBase64,
            },
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: targetPersonBase64,
            },
          },
          {
            text: "Does the person in the second image appear anywhere in the first image (the crowd)? Look carefully for clothing, facial features, and general appearance. Respond with findings."
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            found: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            locationDescription: { type: Type.STRING },
            message: { type: Type.STRING }
          },
          required: ["found", "confidence", "message"]
        }
      }
    });

    // Fixed: The .text property is a getter that returns the extracted string, not a method
    const text = response.text || '{}';
    return JSON.parse(text.trim()) as MissingPersonResult;
  }
}

/**
 * Singleton instance of the crowd analysis service
 * Used throughout the application for all crowd analysis operations
 */
export const crowdAnalysisService = new CrowdAnalysisService();