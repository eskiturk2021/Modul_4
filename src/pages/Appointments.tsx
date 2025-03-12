// src/pages/Appointments.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Calendar, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

interface Appointment {
  id: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
  };
  appointment_date: string;
  appointment_time: string;
  status: string;
}

interface CalendarAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  customer_id: string;
  customer_name: string;
  service_name: string;
  status: string;
}

export default function Appointments() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarAppointments, setCalendarAppointments] = useState<CalendarAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (view === 'list') {
      fetchAppointmentsList();
    } else {
      fetchCalendarAppointments();
    }
  }, [view, status, currentMonth]);

  const fetchAppointmentsList = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/appointments/upcoming', {
        params: {
          status: status || undefined,
        },
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendarAppointments = async () => {
    setIsLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const response = await axios.get('/api/appointments/calendar', {
        params: { year, month },
      });
      setCalendarAppointments(response.data);
    } catch (error) {
      console.error('Error fetching calendar appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await axios.put(`/api/appointments/${appointmentId}`, {
        status: newStatus,
      });

      // Refresh the appointments
      if (view === 'list') {
        fetchAppointmentsList();
      } else {
        fetchCalendarAppointments();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const renderStatusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      'confirmed': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800',
      'new': 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorMap[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get all appointments for the selected day
    const getAppointmentsForDay = (day: Date) => {
      return calendarAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start.split('T')[0]);
        return isSameDay(appointmentDate, day);
      });
    };

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 font-semibold text-sm text-gray-600">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr border-b h-96 overflow-y-auto">
          {days.map((day, _) => {
            const dayAppointments = getAppointmentsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`border-r border-b p-2 min-h-16 ${
                  isCurrentDay ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-semibold ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <span className="text-xs bg-indigo-100 text-indigo-800 rounded-full px-2 py-1">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <Link
                      key={appointment.id}
                      to={`/appointments/${appointment.id}`}
                      className="block text-xs truncate p-1 rounded bg-indigo-50 hover:bg-indigo-100"
                    >
                      {appointment.service_name} - {appointment.start.split('T')[1].substring(0, 5)}
                    </Link>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No appointments found
                </td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{appointment.customer.name}</div>
                        <div className="text-sm text-gray-500">{appointment.customer.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(appointment.appointment_date)}</div>
                    <div className="text-sm text-gray-500">{appointment.appointment_time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(appointment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link to={`/appointments/${appointment.id}`} className="text-indigo-600 hover:text-indigo-900">
                        View
                      </Link>
                      <div className="relative">
                        <select
                          value={appointment.status}
                          onChange={(e) => handleUpdateStatus(appointment.id, e.target.value)}
                          className="block w-full bg-transparent border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm rounded-md"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">Appointments</h1>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <Link to="/appointments/new">
            <Button className="inline-flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4 mb-6">
          <div className="flex space-x-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => setView('list')}
              className="inline-flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              List View
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              onClick={() => setView('calendar')}
              className="inline-flex items-center"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Calendar View
            </Button>
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter className="h-4 w-4" />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-600">Loading appointments...</span>
          </div>
        ) : (
          view === 'list' ? renderListView() : renderCalendarView()
        )}
      </div>
    </>
  );
}