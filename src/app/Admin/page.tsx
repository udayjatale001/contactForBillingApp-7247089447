'use client';
import { OwnerDashboard } from '@/components/owner-dashboard';
import withPasswordProtection from '@/components/with-password-protection';

function AdminPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Owner Dashboard
        </h2>
      </div>
      <OwnerDashboard />
    </div>
  );
}

export default withPasswordProtection(AdminPage);
