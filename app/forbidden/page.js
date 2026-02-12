export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">403</h1>
        <p className="opacity-70 mt-2">You don’t have admin access.</p>
      </div>
    </div>
  );
}
