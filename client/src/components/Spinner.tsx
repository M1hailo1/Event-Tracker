interface SpinnerProps {
  size?: number;
}

export default function Spinner({ size = 32 }: SpinnerProps) {
  return (
    <div
      className="animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-400"
      style={{ width: size, height: size }}
    />
  );
}
