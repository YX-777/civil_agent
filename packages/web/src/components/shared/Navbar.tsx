import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          考公 Agent
        </Link>
        <div className="hidden md:flex space-x-6">
          <Link
            href="/"
            className="text-gray-700 dark:text-gray-300 hover:text-primary"
          >
            对话
          </Link>
          <Link
            href="/focus"
            className="text-gray-700 dark:text-gray-300 hover:text-primary"
          >
            专注模式
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-700 dark:text-gray-300 hover:text-primary"
          >
            数据看板
          </Link>
          <Link
            href="/tasks"
            className="text-gray-700 dark:text-gray-300 hover:text-primary"
          >
            任务管理
          </Link>
          <Link
            href="/calendar"
            className="text-gray-700 dark:text-gray-300 hover:text-primary"
          >
            学习日历
          </Link>
          <Link
            href="/profile"
            className="text-gray-700 dark:text-gray-300 hover:text-primary"
          >
            个人中心
          </Link>
        </div>
      </div>
    </nav>
  );
}