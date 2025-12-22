import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { CrowdAnalysis, MissingPersonResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Fixed: Use named parameter for apiKey and rely exclusively on process.env.API_KEY
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeCrowd(
    frameBase64: string, 
    venueArea: number
  ): Promise<CrowdAnalysis> {
    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

  async findMissingPerson(
    crowdFrameBase64: string,
    targetPersonBase64: string
  ): Promise<MissingPersonResult> {
    const response: GenerateContentResponse = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

export const geminiService = new GeminiService();