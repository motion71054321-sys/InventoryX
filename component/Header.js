import LogoutButton from "@/components/LogoutButton";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <h1 className="font-bold text-xl">InventoryX</h1>
      <LogoutButton />
    </header>
  );
}
