let ChromaClient: any = null;
let Collection: any = null;

export async function getChromaDBClasses() {
  if (typeof (globalThis as any).window !== 'undefined') {
    throw new Error('ChromaDB is not available in browser environment');
  }
  
  if (!ChromaClient || !Collection) {
    const chromadb = await import('chromadb');
    ChromaClient = chromadb.ChromaClient;
    Collection = chromadb.Collection;
  }
  return { ChromaClient, Collection };
}

export async function createChromaClient(path?: string) {
  const { ChromaClient } = await getChromaDBClasses();
  return new ChromaClient({ path });
}