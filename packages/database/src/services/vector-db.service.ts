import { getChromaDBClasses } from './chromadb-wrapper';

export interface VectorSearchResult {
  id: string;
  vector: number[];
  metadata?: any;
  distance?: number;
}

export interface VectorCollectionConfig {
  name: string;
  metadata?: any;
}

export class VectorDBService {
  private chromaClient: any;
  private collections: Map<any, any> = new Map();
  private initialized: boolean = false;
  private vectorDbPath: string;

  constructor(vectorDbPath?: string) {
    this.vectorDbPath = vectorDbPath || process.env.VECTOR_DB_PATH || './data/chroma';
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const { ChromaClient } = await getChromaDBClasses();
      this.chromaClient = new ChromaClient({
        path: this.vectorDbPath
      });

      await this.initializeCollections();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize VectorDB:', error);
      throw error;
    }
  }

  private async initializeCollections(): Promise<void> {
    const collections: VectorCollectionConfig[] = [
      { name: 'user_messages', metadata: { description: 'User message embeddings' } },
      { name: 'user_preferences', metadata: { description: 'User preference embeddings' } },
      { name: 'user_knowledge_mastery', metadata: { description: 'User knowledge mastery embeddings' } },
      { name: 'task_vectors', metadata: { description: 'Task embeddings' } }
    ];

    for (const config of collections) {
      await this.createCollection(config.name, config.metadata);
    }
  }

  async createCollection(name: string, metadata?: any): Promise<void> {
    if (!this.chromaClient) {
      throw new Error('VectorDB not initialized');
    }

    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name,
        metadata
      });
      this.collections.set(name, collection);
    } catch (error) {
      console.error(`Failed to create collection ${name}:`, error);
      throw error;
    }
  }

  async addEmbedding(
    collection: string,
    id: string,
    vector: number[],
    metadata?: any
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      await coll.add({
        ids: [id],
        embeddings: [vector],
        metadatas: metadata ? [metadata] : undefined
      });
    } catch (error) {
      console.error(`Failed to add embedding to ${collection}:`, error);
      throw error;
    }
  }

  async addBatchEmbeddings(
    collection: string,
    embeddings: Array<{ id: string; vector: number[]; metadata?: any }>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      await coll.add({
        ids: embeddings.map(e => e.id),
        embeddings: embeddings.map(e => e.vector),
        metadatas: embeddings.map(e => e.metadata).filter(m => m !== undefined)
      });
    } catch (error) {
      console.error(`Failed to add batch embeddings to ${collection}:`, error);
      throw error;
    }
  }

  async search(
    collection: string,
    queryVector: number[],
    topK: number = 5,
    filter?: any
  ): Promise<VectorSearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      const results = await coll.query({
        queryEmbeddings: [queryVector],
        nResults: topK,
        where: filter
      });

      const searchResults: VectorSearchResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          searchResults.push({
            id: results.ids[0][i],
            vector: results.embeddings?.[0]?.[i] || [],
            metadata: results.metadatas?.[0]?.[i],
            distance: results.distances?.[0]?.[i]
          });
        }
      }

      return searchResults;
    } catch (error) {
      console.error(`Failed to search in ${collection}:`, error);
      throw error;
    }
  }

  async get(collection: string, id: string): Promise<VectorSearchResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      const results = await coll.get({
        ids: [id]
      });

      if (results.ids && results.ids.length > 0) {
        return {
          id: results.ids[0],
          vector: results.embeddings?.[0] || [],
          metadata: results.metadatas?.[0]
        };
      }

      return null;
    } catch (error) {
      console.error(`Failed to get from ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      await coll.delete({
        ids: [id]
      });
    } catch (error) {
      console.error(`Failed to delete from ${collection}:`, error);
      throw error;
    }
  }

  async deleteBatch(collection: string, ids: string[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      await coll.delete({
        ids
      });
    } catch (error) {
      console.error(`Failed to delete batch from ${collection}:`, error);
      throw error;
    }
  }

  async updateEmbedding(
    collection: string,
    id: string,
    vector: number[],
    metadata?: any
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      await coll.update({
        ids: [id],
        embeddings: [vector],
        metadatas: metadata ? [metadata] : undefined
      });
    } catch (error) {
      console.error(`Failed to update embedding in ${collection}:`, error);
      throw error;
    }
  }

  async getCollectionStats(collection: string): Promise<{ count: number }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const coll = this.collections.get(collection);
    if (!coll) {
      throw new Error(`Collection ${collection} not found`);
    }

    try {
      const results = await coll.count();
      return { count: results };
    } catch (error) {
      console.error(`Failed to get stats for ${collection}:`, error);
      throw error;
    }
  }

  async deleteCollection(collection: string): Promise<void> {
    if (!this.chromaClient) {
      throw new Error('VectorDB not initialized');
    }

    try {
      await this.chromaClient.deleteCollection({ name: collection });
      this.collections.delete(collection);
    } catch (error) {
      console.error(`Failed to delete collection ${collection}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.collections.clear();
    this.initialized = false;
  }
}