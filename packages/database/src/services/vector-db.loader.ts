let vectorDBService: any = null;

export async function initializeVectorDB() {
  if (!vectorDBService) {
    if (typeof (globalThis as any).window !== 'undefined') {
      console.warn('VectorDB is not available in browser environment');
      vectorDBService = { 
        initialized: true,
        addEmbedding: async () => {},
        addBatchEmbeddings: async () => {},
        search: async () => [],
        get: async () => null,
        delete: async () => {},
        deleteBatch: async () => {},
        updateEmbedding: async () => {},
        getCollectionStats: async () => ({ count: 0 }),
        deleteCollection: async () => {},
        close: async () => {}
      };
      return vectorDBService;
    }
    
    const { VectorDBService } = await import('./vector-db.service');
    vectorDBService = new VectorDBService();
    await vectorDBService.initialize();
  }
  return vectorDBService;
}

export async function getVectorDBService() {
  if (!vectorDBService) {
    return initializeVectorDB();
  }
  return vectorDBService;
}

export function resetVectorDBService() {
  vectorDBService = null;
}