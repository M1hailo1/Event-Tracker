import Spinner from "./Spinner";

interface LoadingBlockProps {
  label?: string;
  size?: number;
  compact?: boolean;
}

export default function LoadingBlock({
  label = "Loading...",
  size = 32,
  compact = false,
}: LoadingBlockProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        compact ? "py-6" : "py-12"
      }`}
    >
      <Spinner size={size} />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
