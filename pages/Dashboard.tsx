import React, { useEffect } from 'react';
import { useStore } from '../store';
import { StudentDashboard } from '../components/dashboard/StudentDashboard';
import { TeacherDashboard } from '../components/dashboard/TeacherDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useStore();

  if (user?.role === 'STUDENT') {
    return <StudentDashboard />;
  }

  return <TeacherDashboard />;
};