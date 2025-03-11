
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Calendar,
  TrendingUp,
  UserPlus,
  RefreshCw
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AppointmentList } from '@/components/dashboard/AppointmentList';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServicesPieChart } from '@/components/dashboard/ServicesPieChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalCustomersTrend: { direction: 'same' as 'up' | 'down' | 'same', value: 0 },
    newCustomers: 0,
    newCustomersTrend: { direction: 'same' as 'up' | 'down' | 'same', value: 0 },
    returningCustomersPercentage: '0%',
    returningCustomersTrend: { direction: 'same' as 'up' | 'down' | 'same', value: 0 },
    scheduledAppointments: 0,
    scheduledAppointmentsTrend: { direction: 'same' as 'up' | 'down' | 'same', value: 0 },
  });

  const [appointments, setAppointments] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch statistics
        const statsResponse = await axios.get('/api/dashboard/stats');
        setStats(statsResponse.data);

        // Fetch upcoming appointments
        const appointmentsResponse = await axios.get('/api/appointments/upcoming');
        setAppointments(appointmentsResponse.data);

        // Mock revenue data - replace with actual API call
        const mockRevenueData = [
          { month: 'Jan', revenue: 12000, expenses: 8000, profit: 4000 },
          { month: 'Feb', revenue: 14000, expenses: 9000, profit: 5000 },
          { month: 'Mar', revenue: 16000, expenses: 10000, profit: 6000 },
          { month: 'Apr', revenue: 18000, expenses: 11000, profit: 7000 },
          { month: 'May', revenue: 20000, expenses: 12000, profit: 8000 },
          { month: 'Jun', revenue: 22000, expenses: 13000, profit: 9000 },
        ];
        setRevenueData(mockRevenueData);

        // Mock services data - replace with actual API call
        const mockServicesData = [
          { name: 'Tire Change', value: 35 },
          { name: 'Oil Change', value: 30 },
          { name: 'Brake Service', value: 15 },
          { name: 'Wheel Alignment', value: 10 },
          { name: 'General Maintenance', value: 10 },
        ];
        setServicesData(mockServicesData);

        // Fetch recent activities
        const activitiesResponse = await axios.get('/api/activity/recent');
        setActivities(activitiesResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600">Loading dashboard data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">Dashboard</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={<Users className="h-5 w-5 text-gray-500" />}
          trend={stats.totalCustomersTrend}
        />
        <StatCard
          title="New Customers"
          value={stats.newCustomers}
          icon={<UserPlus className="h-5 w-5 text-gray-500" />}
          trend={stats.newCustomersTrend}
        />
        <StatCard
          title="Returning Customers"
          value={stats.returningCustomersPercentage}
          icon={<RefreshCw className="h-5 w-5 text-gray-500" />}
          trend={stats.returningCustomersTrend}
        />
        <StatCard
          title="Scheduled Appointments"
          value={stats.scheduledAppointments}
          icon={<Calendar className="h-5 w-5 text-gray-500" />}
          trend={stats.scheduledAppointmentsTrend}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RevenueChart data={revenueData} />
        <ServicesPieChart data={servicesData} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AppointmentList appointments={appointments} />
        <ActivityFeed activities={activities} />
      </div>
    </DashboardLayout>
  );
}