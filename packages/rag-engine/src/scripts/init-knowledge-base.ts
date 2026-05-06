/**
 * 技术知识库初始化脚本
 */

import { VectorRetriever } from "../retrievers/vector-retriever";
import { BM25Retriever } from "../retrievers/bm25-retriever";

// React 开发知识
const REACT_KNOWLEDGE = [
  {
    content: `React Hooks 入门指南

useState 是最基础的 Hook，用于管理组件内部状态：
const [state, setState] = useState(initialValue);

useEffect 用于处理副作用，如数据获取、订阅：
useEffect(() => {
  // 副作用代码
  return () => { // 清理函数 };
}, [dependencies]);

useRef 用于获取 DOM 引用或保存可变值：
const ref = useRef(initialValue);

最佳实践：
1. 将相关状态组合成对象
2. 使用 useCallback 缓存回调函数
3. 使用 useMemo 缓存计算结果
4. 自定义 Hook 提取复用逻辑`,
    metadata: { title: "React Hooks 入门", source: "TechMate 知识库", category: "react" },
  },
  {
    content: `React 组件设计模式

1. 容器组件与展示组件分离
- 容器组件：处理逻辑、数据获取
- 展示组件：只负责渲染，接收 props

2. 高阶组件 (HOC)
const withAuth = (Component) => {
  return (props) => {
    if (!isLoggedIn) return <Login />;
    return <Component {...props} />;
  };
};

3. Render Props 模式
<DataProvider render={(data) => <Display data={data} />} />

4. 自定义 Hook
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}`,
    metadata: { title: "React 组件设计模式", source: "TechMate 知识库", category: "react" },
  },
  {
    content: `React 性能优化技巧

1. React.memo 防止不必要的重渲染
const MemoComponent = React.memo(MyComponent);

2. useMemo 缓存计算结果
const expensiveValue = useMemo(() => computeHeavy(input), [input]);

3. useCallback 缓存回调函数
const handleClick = useCallback(() => doSomething(id), [id]);

4. 虚拟列表渲染大量数据
使用 react-window 或 react-virtualized

5. 代码分割与懒加载
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

6. 避免内联对象和函数作为 props
// 错误：每次渲染创建新对象
<Component style={{ color: 'red' }} />

// 正确：使用稳定的引用
const style = { color: 'red' };
<Component style={style} />`,
    metadata: { title: "React 性能优化", source: "TechMate 知识库", category: "react" },
  },
];

// TypeScript 进阶知识
const TYPESCRIPT_KNOWLEDGE = [
  {
    content: `TypeScript 类型系统核心概念

1. 基础类型
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;
let arr: number[] = [1, 2, 3];
let tuple: [string, number] = ["a", 1];

2. 接口定义
interface User {
  id: number;
  name: string;
  email?: string;  // 可选属性
  readonly createdAt: Date;  // 只读属性
}

3. 类型别名
type Point = { x: number; y: number };
type ID = string | number;  // 联合类型

4. 泛型
function identity<T>(arg: T): T {
  return arg;
}
const result = identity<string>("hello");`,
    metadata: { title: "TypeScript 基础类型", source: "TechMate 知识库", category: "typescript" },
  },
  {
    content: `TypeScript 高级类型技巧

1. 类型推断与类型守卫
function isString(val: unknown): val is string {
  return typeof val === 'string';
}

2. 条件类型
type NonNullable<T> = T extends null | undefined ? never : T;

3. 映射类型
type Readonly<T> = { readonly P in keyof T: T[P] };
type Partial<T> = { P in keyof T?: T[P] };

4. 工具类型
Pick<T, K> - 选择部分属性
Omit<T, K> - 排除部分属性
Record<K, T> - 构造对象类型
ReturnType<T> - 获取函数返回类型

5. 模板字面量类型
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`;  // "onClick" | "onFocus" | "onBlur"`,
    metadata: { title: "TypeScript 高级类型", source: "TechMate 知识库", category: "typescript" },
  },
];

// Next.js 实战知识
const NEXTJS_KNOWLEDGE = [
  {
    content: `Next.js 14 核心特性

1. App Router (app/)
- app/page.tsx - 页面组件
- app/layout.tsx - 布局组件
- app/loading.tsx - 加载状态
- app/error.tsx - 错误处理

2. Server Components vs Client Components
// 默认是 Server Component
async function ServerComponent() {
  const data = await fetchAPI();  // 可以直接访问后端
  return <div>{data}</div>;
}

// 需要交互时使用 Client Component
'use client';
function ClientComponent() {
  const [state, setState] = useState(0);  // 可以使用 Hooks
  return <button onClick={() => setState(s => s + 1)}>{state}</button>;
}

3. 数据获取
async function getData() {
  const res = await fetch('https://api...', { next: { revalidate: 60 } });
  return res.json();
}`,
    metadata: { title: "Next.js 14 核心", source: "TechMate 知识库", category: "nextjs" },
  },
  {
    content: `Next.js 性能优化实践

1. 图片优化
import Image from 'next/image';
<Image src="/hero.jpg" alt="Hero" width={800} height={600} priority />

2. 字体优化
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

3. 路径别名配置 (tsconfig.json)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

4. 预渲染策略
- SSG: 静态生成 (build 时渲染)
- SSR: 服务端渲染 (请求时渲染)
- ISR: 增量静态再生 (定时重新生成)

5. 代码分割
import dynamic from 'next/dynamic';
const DynamicComponent = dynamic(() => import('./Heavy'), { loading: () => <p>Loading...</p> });`,
    metadata: { title: "Next.js 性能优化", source: "TechMate 知识库", category: "nextjs" },
  },
];

// 算法刷题知识
const ALGORITHM_KNOWLEDGE = [
  {
    content: `前端算法面试高频题型

1. 数组类
- 两数之和 (哈希表)
- 合并两个有序数组 (双指针)
- 数组去重 (Set 或双指针)

2. 字符串类
- 字符串反转 (双指针)
- 最长无重复子串 (滑动窗口)
- 字符串匹配 (KMP 算法)

3. 链表类
- 链表反转 (迭代或递归)
- 合并两个有序链表
- 检测环 (快慢指针)

4. 树类
- 二叉树遍历 (DFS/BFS)
- 最大深度 (递归)
- 最近公共祖先

5. 动态规划
- 斐波那契数列
- 最长递增子序列
- 背包问题`,
    metadata: { title: "前端算法高频题型", source: "TechMate 知识库", category: "algorithm" },
  },
];

// 合并所有知识
const ALL_KNOWLEDGE = [
  ...REACT_KNOWLEDGE,
  ...TYPESCRIPT_KNOWLEDGE,
  ...NEXTJS_KNOWLEDGE,
  ...ALGORITHM_KNOWLEDGE,
];

export async function initializeKnowledgeBase(): Promise<void> {
  console.log("Initializing TechMate knowledge base...");

  const vectorRetriever = new VectorRetriever();
  const bm25Retriever = new BM25Retriever();

  // 添加向量索引
  console.log("Adding documents to vector index...");
  const ids = await vectorRetriever.addBatchDocuments(ALL_KNOWLEDGE);
  console.log(`Added ${ids.length} documents to vector index`);

  // 构建 BM25 索引
  console.log("Building BM25 index...");
  await bm25Retriever.buildIndex(
    ALL_KNOWLEDGE.map((doc, i) => ({
      id: ids[i],
      content: doc.content,
      metadata: doc.metadata,
    }))
  );
  console.log("BM25 index built successfully");

  console.log("Knowledge base initialized!");
}

// 导出知识文档供测试使用
export { ALL_KNOWLEDGE, REACT_KNOWLEDGE, TYPESCRIPT_KNOWLEDGE, NEXTJS_KNOWLEDGE, ALGORITHM_KNOWLEDGE };