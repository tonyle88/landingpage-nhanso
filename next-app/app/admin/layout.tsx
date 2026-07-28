import { AdminPendingOverlay } from "./admin-pending-overlay";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminPendingOverlay />
      {children}
    </>
  );
}
