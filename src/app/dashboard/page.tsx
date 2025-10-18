import RequireAuth from "@/components/auth/RequireAuth";
export default function DashboardPage() {
  return (
    <RequireAuth>
      <div className="container-psi py-10">
        <h1 className="text-[20px] font-semibold text-[#111827]">Dashboard</h1>
        <p className="mt-2 text-[12px] text-[#6b7280]">Vista general (pendiente de funcionalidad).</p>
      </div>
    </RequireAuth>
  );
}


