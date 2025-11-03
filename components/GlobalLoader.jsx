import { useLoading } from "../context/LoadingContext";

export default function GlobalLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80">
      <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
