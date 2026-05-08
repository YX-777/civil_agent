import { getPrismaClient, initializeDatabase, disconnectDatabase } from '@tech-mate/database';

let initialized = false;

export async function getDatabase() {
  if (!initialized) {
    await initializeDatabase({ skipVectorDB: true });
    initialized = true;
  }
  return getPrismaClient();
}

export async function ensureDatabaseInitialized() {
  if (!initialized) {
    await initializeDatabase({ skipVectorDB: true });
    initialized = true;
  }
}

export async function closeDatabase() {
  if (initialized) {
    await disconnectDatabase();
    initialized = false;
  }
}