'use client';

import InstructorDashboardView from './InstructorDashboardView';
import useInstructorDashboard from './useInstructorDashboard';

export default function InstructorDashboardPage() {
  const { dashboard, loading, error, reload } = useInstructorDashboard();

  return (
    <InstructorDashboardView
      dashboard={dashboard}
      loading={loading}
      error={error}
      onRefresh={reload}
    />
  );
}
