export interface Conversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export const conversations = new Map<string, Conversation>();
