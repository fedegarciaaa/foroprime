import { Navbar } from "@/components/nav/navbar";
import { Sidebar } from "@/components/nav/sidebar";
import { Footer } from "@/components/nav/footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 px-0 sm:px-4">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
