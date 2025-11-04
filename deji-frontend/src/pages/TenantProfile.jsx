import DashboardLayout from "../layouts/DashboardLayout";
import { useTenant } from "../context/TenantContext";

export default function TenantProfile() {
  const { tenant } = useTenant();

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <img
          src={tenant?.logo || "/default-logo.png"}
          alt="Tenant Logo"
          className="w-24 h-24 rounded-lg object-contain"
        />
        <div>
          <h1 className="text-2xl font-semibold">{tenant?.name}</h1>
          <p className="text-gray-500">{tenant?.email}</p>
          <p className="text-gray-500 mt-2">Phone: {tenant?.phone || "—"}</p>
          <p className="text-gray-500">Address: {tenant?.address || "—"}</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Tenant Overview</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Here you can see your tenant’s details, manage your business profile, and
          customize branding.
        </p>
      </div>
    </DashboardLayout>
  );
}
