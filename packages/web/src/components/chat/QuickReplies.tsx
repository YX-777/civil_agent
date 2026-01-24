import { QuickReply } from "@/types";

interface QuickRepliesProps {
  options: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export default function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-4">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}