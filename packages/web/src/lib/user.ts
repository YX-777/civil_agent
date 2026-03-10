import { getDatabase } from './database';
import { getUserRepository } from '@civil-agent/database';

export async function getOrCreateUser(userId: string) {
  const prisma = await getDatabase();
  const userRepo = getUserRepository();

  return userRepo.findOrCreateUser(userId);
}

export async function getUserProfile(userId: string) {
  const prisma = await getDatabase();
  const userRepo = getUserRepository();

  return userRepo.getUserProfile(userId);
}

export async function updateUserProfile(userId: string, data: any) {
  const prisma = await getDatabase();
  const userRepo = getUserRepository();

  return userRepo.updateUserProfile(userId, data);
}