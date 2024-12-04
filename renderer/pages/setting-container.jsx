export default function SettingContainer({ children, title, description }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-6 border-b border-white/5 bg-gray-900 px-4 shadow-sm sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
      </div>

      <main className="py-10">
        <div className="px-4 sm:px-6 lg:px-8">
          {description && (
            <header className="mb-4">
              <p className="text-sm/6 text-gray-400">{description}</p>
            </header>
          )}
          {/* Children content */}
          {children}
        </div>
      </main>
    </div>
  );
}
