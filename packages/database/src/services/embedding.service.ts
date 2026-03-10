import axios, { AxiosInstance } from 'axios';

export interface EmbeddingResponse {
  output: {
    embeddings: number[][];
  };
  usage: {
    total_tokens: number;
  };
  request_id: string;
}

export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private axiosInstance: AxiosInstance;
  private model: string;

  constructor(apiKey?: string, apiUrl?: string, model?: string) {
    this.apiKey = apiKey || process.env.EMBEDDING_API_KEY || '';
    this.apiUrl = apiUrl || process.env.EMBEDDING_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding-v2';
    this.model = model || 'text-embedding-v2';

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.axiosInstance.post<EmbeddingResponse>('', {
        model: this.model,
        input: {
          texts: [text]
        },
        parameters: {
          text_type: 'document'
        }
      });

      if (response.data.output.embeddings && response.data.output.embeddings.length > 0) {
        return response.data.output.embeddings[0];
      }

      throw new Error('No embedding returned from API');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Embedding API error:', error.response?.data || error.message);
        throw new Error(`Embedding generation failed: ${error.response?.data?.message || error.message}`);
      }
      console.error('Embedding generation error:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const batchSize = 25;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.axiosInstance.post<EmbeddingResponse>('', {
          model: this.model,
          input: {
            texts: batch
          },
          parameters: {
            text_type: 'document'
          }
        });

        if (response.data.output.embeddings) {
          allEmbeddings.push(...response.data.output.embeddings);
        }
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error(`Batch embedding API error (batch ${i / batchSize}):`, error.response?.data || error.message);
          throw new Error(`Batch embedding generation failed: ${error.response?.data?.message || error.message}`);
        }
        console.error('Batch embedding generation error:', error);
        throw error;
      }
    }

    return allEmbeddings;
  }

  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await this.axiosInstance.post<EmbeddingResponse>('', {
        model: this.model,
        input: {
          texts: [query]
        },
        parameters: {
          text_type: 'query'
        }
      });

      if (response.data.output.embeddings && response.data.output.embeddings.length > 0) {
        return response.data.output.embeddings[0];
      }

      throw new Error('No embedding returned from API');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('Query embedding API error:', error.response?.data || error.message);
        throw new Error(`Query embedding generation failed: ${error.response?.data?.message || error.message}`);
      }
      console.error('Query embedding generation error:', error);
      throw error;
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  setApiUrl(apiUrl: string): void {
    this.apiUrl = apiUrl;
    this.axiosInstance.defaults.baseURL = apiUrl;
  }

  setModel(model: string): void {
    this.model = model;
  }
}