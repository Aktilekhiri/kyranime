// Показывается сразу при переходе между страницами, пока сервер готовит данные
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded-lg bg-ink-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[2/3] rounded-xl bg-ink-100" />
            <div className="h-3 w-3/4 rounded bg-ink-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
