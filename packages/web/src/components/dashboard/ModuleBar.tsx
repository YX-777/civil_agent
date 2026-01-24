interface ModuleBarProps {
  name: string;
  accuracy: number;
  color: string;
}

export default function ModuleBar({ name, accuracy, color }: ModuleBarProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {name}
        </span>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {accuracy}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{ width: `${accuracy}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}