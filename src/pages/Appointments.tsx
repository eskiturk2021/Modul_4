// ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ: src/pages/Appointments.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

import { Button } from '@/components/ui/Button';
import { DynamicTable } from '@/components/ui/DynamicTable';
import { formatDate } from '@/lib/utils';
import apiService from '@/services/apiService';

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
  appointment_time: string; // ✅ ИЗМЕНЕНО: Теперь это всегда строка, не Date
  status: string;
  estimated_cost?: number;
}

interface CalendarAppointment {
  id: string;
  title: string;
  start: string; // ✅ ISO datetime строка
  end: string;   // ✅ ISO datetime строка
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    try {
      console.log('📅 Загрузка списка записей...');

      const params: Record<string, string> = {};
      if (status) {
        params.status = status;
      }

      const response = await apiService.get<Appointment[]>('/api/appointments/upcoming', {
        params
      });

      console.log('✅ Записи загружены:', response);

      const appointmentsData = Array.isArray(response) ? response : (response as any)?.data || [];
      setAppointments(appointmentsData);
      console.log(`📊 Установлено ${appointmentsData.length} записей`);

    } catch (error: any) {
      console.error('❌ Ошибка при загрузке записей:', error);
      setError(error?.message || 'Не удалось загрузить записи');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalendarAppointments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📅 Загрузка календарных записей...');
      console.log('🗓️ Текущий месяц:', currentMonth);

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1; // JavaScript months are 0-based

      console.log(`🔍 Запрос календаря: year=${year}, month=${month}`);

      const response = await apiService.get<CalendarAppointment[]>('/api/appointments/calendar', {
        params: { year: year.toString(), month: month.toString() }
      });

      console.log('✅ Календарные записи загружены:', response);

      const calendarData = Array.isArray(response) ? response : (response as any)?.data || [];
      setCalendarAppointments(calendarData);
      console.log(`📊 Установлено ${calendarData.length} календарных записей`);

    } catch (error: any) {
      console.error('❌ Ошибка при загрузке календарных записей:', error);
      setError(error?.message || 'Не удалось загрузить календарь');
      setCalendarAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ИСПРАВЛЕНО: Безопасная обработка времени
  const formatAppointmentTime = (timeString: string): string => {
    try {
      // Если это уже строка времени в формате "HH:MM", возвращаем как есть
      if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}$/)) {
        return timeString;
      }

      // Если это ISO время "HH:MM:SS", извлекаем "HH:MM"
      if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeString.substring(0, 5); // "09:30:00" -> "09:30"
      }

      // Fallback
      console.warn('⚠️ Неожиданный формат времени:', timeString);
      return timeString || '09:00';

    } catch (error) {
      console.error('❌ Ошибка форматирования времени:', error);
      return '09:00';
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
      console.log(`🔄 Обновление статуса записи ${appointmentId} на ${newStatus}`);

      await apiService.put(`/api/appointments/${appointmentId}`, {
        status: newStatus,
      });

      console.log('✅ Статус обновлен');

      if (view === 'list') {
        fetchAppointmentsList();
      } else {
        fetchCalendarAppointments();
      }
    } catch (error: any) {
      console.error('❌ Ошибка при обновлении статуса:', error);
      setError(error?.message || 'Не удалось обновить статус');
    }
  };

  const handleRowClick = (appointment: Appointment) => {
    console.log('Клик по записи:', appointment);
  };

  // ✅ ИСПРАВЛЕНО: Кастомные рендереры с правильной обработкой времени
  const customRenderers = {
    customer: (value: any, item: Appointment) => (
      <div className="flex items-center">
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{value?.name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{value?.phone || 'No phone'}</div>
        </div>
      </div>
    ),

    service: (value: any) => (
      <div className="text-sm text-gray-900">{value?.name || 'Unknown service'}</div>
    ),

    // ✅ ИСПРАВЛЕНО: Правильная обработка времени
    appointment_date: (value: string, item: Appointment) => (
      <div>
        <div className="text-sm text-gray-900">
          {value ? formatDate(value) : 'No date'}
        </div>
        <div className="text-sm text-gray-500">
          {formatAppointmentTime(item.appointment_time)}
        </div>
      </div>
    ),

    status: (value: string, item: Appointment) => (
      <div className="flex items-center space-x-2">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'confirmed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'cancelled' ? 'bg-red-100 text-red-800' :
          value === 'completed' ? 'bg-blue-100 text-blue-800' :
          value === 'new' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              e.stopPropagation();
              handleUpdateStatus(item.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="block w-full bg-transparent border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm rounded-md"
            disabled={isLoading}
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    ),

    actions: (value: any, item: Appointment) => (
      <div className="text-right text-sm font-medium">
        <Link
          to={`/appointments/${item.id}`}
          className="text-indigo-600 hover:text-indigo-900"
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
      </div>
    )
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // ✅ ИСПРАВЛЕНО: Безопасная работа с календарными событиями
    const getAppointmentsForDay = (day: Date) => {
      return calendarAppointments.filter(appointment => {
        try {
          // Извлекаем дату из ISO строки "2025-09-21T09:00:00"
          const appointmentDate = new Date(appointment.start.split('T')[0]);
          return isSameDay(appointmentDate, day);
        } catch (error) {
          console.warn('⚠️ Ошибка парсинга даты события:', appointment.start, error);
          return false;
        }
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
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 py-2 px-3 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}

          {days.map((day, dayIdx) => {
            const dayAppointments = getAppointmentsForDay(day);

            return (
              <div
                key={dayIdx}
                className={`min-h-[100px] bg-white p-2 ${
                  isToday(day) ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`text-sm font-medium ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="mt-1 space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => {
                    // ✅ ИСПРАВЛЕНО: Безопасное извлечение времени из ISO строки
                    let displayTime = '09:00';
                    try {
                      const timeMatch = appointment.start.match(/T(\d{2}:\d{2})/);
                      if (timeMatch) {
                        displayTime = timeMatch[1];
                      }
                    } catch (error) {
                      console.warn('⚠️ Ошибка извлечения времени:', appointment.start, error);
                    }

                    return (
                      <div
                        key={appointment.id}
                        className={`text-xs px-1 py-0.5 rounded truncate ${
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}
                        title={`${displayTime} - ${appointment.title}`}
                      >
                        {displayTime} - {appointment.customer_name}
                      </div>
                    );
                  })}

                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500">
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

  // Остальная часть компонента остается без изменений
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <Button
              variant={view === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              List View
            </Button>
            <Button
              variant={view === 'calendar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Calendar View
            </Button>
          </div>
          <Link to="/appointments/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={view === 'list' ? fetchAppointmentsList : fetchCalendarAppointments}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {view === 'list' ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchAppointmentsList}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          <DynamicTable
            data={appointments}
            columns={[
              { key: 'customer', label: 'Customer' },
              { key: 'service', label: 'Service' },
              { key: 'appointment_date', label: 'Date & Time' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' }
            ]}
            customRenderers={customRenderers}
            onRowClick={handleRowClick}
            emptyMessage="No appointments found"
            isLoading={isLoading}
          />
        </div>
      ) : (
        renderCalendarView()
      )}
    </div>
  );
}