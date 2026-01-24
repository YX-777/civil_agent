interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-600 dark:text-gray-400 text-sm">{title}</div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-sm text-gray-500 dark:text-gray-500">{subtitle}</div>
      )}
    </div>
  );
}