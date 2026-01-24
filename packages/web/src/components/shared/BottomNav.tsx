import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "对话", icon: "💬" },
  { href: "/focus", label: "专注", icon: "🎯" },
  { href: "/dashboard", label: "看板", icon: "📊" },
  { href: "/tasks", label: "任务", icon: "✅" },
  { href: "/profile", label: "我的", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center px-4 py-2 text-sm ${
              pathname === item.href
                ? "text-primary"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}