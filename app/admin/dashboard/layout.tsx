import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/session";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />
      <div className="md:ml-64 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}
