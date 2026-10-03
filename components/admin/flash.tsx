export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null
  return (
    <div
      role={error ? "alert" : "status"}
      className={
        "mb-6 rounded-md border px-4 py-3 text-sm " +
        (error
          ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100")
      }
    >
      {error ?? ok}
    </div>
  )
}
