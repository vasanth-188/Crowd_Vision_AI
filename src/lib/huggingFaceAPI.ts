/**
 * Hugging Face Inference API Wrapper
 * Handles Qwen2.5-VL (7B) calls for deep scene analysis and advanced vision tasks
 */

export interface HFSceneAnalysisResult {
  crowdMood?: string;
  behaviorPatterns?: string[];
  anomalies?: string[];
  densityContext?: string;
  riskFactors?: string[];
  recommendations?: string[];
}

export interface HFPersonMatchResult {
  matches: Array<{
    confidence: number;
    description: string;
    location?: string;
  }>;
  bestMatch?: {
    confidence: number;
    description: string;
  };
}

// Configuration
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || '';
const HF_API_URL = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class HuggingFaceAPIClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private requestTimes: number[] = [];
  private rateLimitConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
  };

  /**
   * Analyze crowd scene for context and insights
   */
  async analyzeScene(
    imageBase64: string,
    detectionCount: number,
    onProgress?: (progress: number, status: string) => void
  ): Promise<HFSceneAnalysisResult> {
    if (!HF_API_KEY) {
      console.warn('HF_API_KEY not configured. Scene analysis disabled.');
      return {};
    }

    onProgress?.(30, 'Analyzing scene context...');

    const prompt = `Analyze this crowd scene image and provide insights about:
1. Overall crowd mood/atmosphere (peaceful, tense, chaotic, etc.)
2. Observed behavior patterns (static, moving, dancing, running, etc.)
3. Any anomalies or unusual activities
4. Crowd density assessment (sparse, moderate, dense, very dense)
5. Potential risk factors (if any)
6. Recommendations for crowd management

Detected people count: ${detectionCount}

Be concise and specific. Provide actionable insights.`;

    try {
      const response = await this.callQwenAPI(imageBase64, prompt);
      onProgress?.(70, 'Processing analysis...');

      return this.parseSceneAnalysis(response);
    } catch (error) {
      console.error('Scene analysis failed:', error);
      return {};
    }
  }

  /**
   * Find matching person in crowd
   */
  async findPersonInCrowd(
    referenceImageBase64: string,
    crowdImageBase64: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<HFPersonMatchResult> {
    if (!HF_API_KEY) {
      console.warn('HF_API_KEY not configured. Person search disabled.');
      return { matches: [] };
    }

    onProgress?.(30, 'Searching for person...');

    const prompt = `You have two images:
1. Reference image: A specific person to find
2. Crowd image: A crowd scene

Analyze the reference image to understand the person's distinctive features (clothing, appearance, etc.).
Then search the crowd image for any matching individuals.

Provide:
1. Confidence level (0-100) for each potential match
2. Specific location description (left/center/right, foreground/background)
3. Notable distinguishing features that helped with identification
4. The best match with highest confidence

Be thorough but accurate. Only report matches with reasonable confidence.`;

    try {
      // Note: In real implementation, you'd need to handle two images
      // For now, we'll use a simplified approach
      const response = await this.callQwenAPI(crowdImageBase64, prompt);
      onProgress?.(70, 'Processing results...');

      return this.parsePersonMatch(response);
    } catch (error) {
      console.error('Person search failed:', error);
      return { matches: [] };
    }
  }

  /**
   * Private: Call Qwen2.5-VL API with rate limiting
   */
  private async callQwenAPI(imageBase64: string, prompt: string): Promise<string> {
    // Check rate limits
    await this.checkRateLimit();

    // Add to queue and process
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await fetch(HF_API_URL, {
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
              inputs: {
                image: imageBase64,
                text: prompt,
              },
              parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
          }

          const data = await response.json();
          const result = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;

          resolve(result || '');
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Private: Process request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Queue request failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Private: Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.windowMs;

    // Remove old request times outside the window
    this.requestTimes = this.requestTimes.filter(time => time > windowStart);

    // Check if we've exceeded limit
    if (this.requestTimes.length >= this.rateLimitConfig.maxRequests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = oldestRequest + this.rateLimitConfig.windowMs - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime + 100));
        return this.checkRateLimit(); // Recursive check after waiting
      }
    }

    // Record this request
    this.requestTimes.push(now);
  }

  /**
   * Private: Parse scene analysis response
   */
  private parseSceneAnalysis(response: string): HFSceneAnalysisResult {
    try {
      // Extract structured information from LLM response
      const result: HFSceneAnalysisResult = {};

      // Simple parsing - in production, use more sophisticated NLP
      if (response.toLowerCase().includes('peaceful')) {
        result.crowdMood = 'peaceful';
      } else if (response.toLowerCase().includes('tense')) {
        result.crowdMood = 'tense';
      } else if (response.toLowerCase().includes('chaotic')) {
        result.crowdMood = 'chaotic';
      }

      // Extract behavior patterns
      const patterns = [];
      if (response.toLowerCase().includes('static')) patterns.push('static');
      if (response.toLowerCase().includes('moving')) patterns.push('moving');
      if (response.toLowerCase().includes('running')) patterns.push('running');
      if (response.toLowerCase().includes('dancing')) patterns.push('dancing');
      if (patterns.length > 0) result.behaviorPatterns = patterns;

      // Extract anomalies
      if (response.toLowerCase().includes('anomal')) {
        result.anomalies = ['Unusual activity detected'];
      }

      // Extract density
      if (response.toLowerCase().includes('very dense')) {
        result.densityContext = 'very-dense';
      } else if (response.toLowerCase().includes('dense')) {
        result.densityContext = 'dense';
      }

      return result;
    } catch (error) {
      console.error('Failed to parse scene analysis:', error);
      return {};
    }
  }

  /**
   * Private: Parse person match response
   */
  private parsePersonMatch(response: string): HFPersonMatchResult {
    try {
      const result: HFPersonMatchResult = { matches: [] };

      // Simple parsing - extract confidence scores and descriptions
      const lines = response.split('\n');
      for (const line of lines) {
        if (line.includes('confidence') || line.includes('match')) {
          result.matches.push({
            confidence: 75, // Placeholder - parse from response
            description: line.trim(),
          });
        }
      }

      if (result.matches.length > 0) {
        result.bestMatch = result.matches[0];
      }

      return result;
    } catch (error) {
      console.error('Failed to parse person match:', error);
      return { matches: [] };
    }
  }
}

// Export singleton instance
export const hfClient = new HuggingFaceAPIClient();
