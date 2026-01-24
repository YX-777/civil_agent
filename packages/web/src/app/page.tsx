"use client";

import { useAgent } from "@/hooks/use-agent";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import QuickReplies from "@/components/chat/QuickReplies";
import Navbar from "@/components/shared/Navbar";
import BottomNav from "@/components/shared/BottomNav";

export default function ChatPage() {
  const { messages, isLoading, quickReplies, sendMessage, handleQuickReply } =
    useAgent();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="pb-20 md:pb-0 pt-4 md:pt-20">
        <div className="max-w-4xl mx-auto px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">开始与 AI 助手对话吧</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          {quickReplies && quickReplies.length > 0 && (
            <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
          )}
        </div>
      </main>
      <BottomNav />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}