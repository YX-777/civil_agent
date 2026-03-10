import { SyncService } from './sync.service';

let syncService: SyncService | null = null;

export async function getSyncService(): Promise<SyncService> {
  if (!syncService) {
    const { SyncService } = await import('./sync.service');
    const { getPrismaClient } = await import('../index');
    const { MessageRepository } = await import('../repositories/message.repository');
    const { getVectorDBService } = await import('./vector-db.loader');
    const { getEmbeddingService } = await import('../index');

    const prismaClient = getPrismaClient();
    const messageRepo = new MessageRepository(prismaClient);
    const vectorService = await getVectorDBService();
    const embeddingService = getEmbeddingService();

    syncService = new SyncService(prismaClient, messageRepo, vectorService, embeddingService);
  }
  return syncService;
}

export function resetSyncService(): void {
  syncService = null;
}