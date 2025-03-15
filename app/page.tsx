export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      Header
      <main className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
        <div className="md:col-span-1">
          File Sidebar
        </div>
        <div className="md:col-span-3">File Content</div>
      </main>
    </div>
  );
}
