// src/pages/Appointments.tsx
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
  appointment_time: string;
  status: string;
  estimated_cost?: number;
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

      // Проверяем структуру ответа
      const appointmentsData = Array.isArray(response) ? response : (response as any)?.data || [];

      setAppointments(appointmentsData);
      console.log(`📊 Установлено ${appointmentsData.length} записей`);

    } catch (error: any) {
      console.error('❌ Ошибка при загрузке записей:', error);
      setError(error?.message || 'Не удалось загрузить записи');

      // Fallback к пустому массиву
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

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const response = await apiService.get<CalendarAppointment[]>('/api/appointments/calendar', {
        params: { year, month }
      });

      console.log('✅ Календарные записи загружены:', response);

      // Проверяем структуру ответа
      const calendarData = Array.isArray(response) ? response : (response as any)?.data || [];

      setCalendarAppointments(calendarData);
      console.log(`📊 Установлено ${calendarData.length} календарных записей`);

    } catch (error: any) {
      console.error('❌ Ошибка при загрузке календарных записей:', error);
      setError(error?.message || 'Не удалось загрузить календарь');

      // Fallback к пустому массиву
      setCalendarAppointments([]);
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
      console.log(`🔄 Обновление статуса записи ${appointmentId} на ${newStatus}`);

      await apiService.put(`/api/appointments/${appointmentId}`, {
        status: newStatus,
      });

      console.log('✅ Статус обновлен');

      // Обновляем данные
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
    // Навигация к деталям записи
    console.log('Клик по записи:', appointment);
    // window.location.href = `/appointments/${appointment.id}`;
  };

  // Кастомные рендереры для DynamicTable
  const customRenderers = {
    // Рендер информации о клиенте
    customer: (value: any, item: Appointment) => (
      <div className="flex items-center">
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{value?.name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{value?.phone || 'No phone'}</div>
        </div>
      </div>
    ),

    // Рендер информации о сервисе
    service: (value: any) => (
      <div className="text-sm text-gray-900">{value?.name || 'Unknown service'}</div>
    ),

    // Рендер даты и времени записи
    appointment_date: (value: string, item: Appointment) => (
      <div>
        <div className="text-sm text-gray-900">
          {value ? formatDate(value) : 'No date'}
        </div>
        <div className="text-sm text-gray-500">{item.appointment_time || 'No time'}</div>
      </div>
    ),

    // Рендер статуса
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

    // Добавляем рендер для действий (View ссылка)
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
                      {appointment.service_name} - {appointment.start.split('T')[1]?.substring(0, 5)}
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

  // Подготавливаем данные для DynamicTable
  const prepareTableData = () => {
    return appointments.map(appointment => ({
      ...appointment,
      // Добавляем виртуальное поле для действий
      actions: 'actions'
    }));
  };

  // ИСПРАВЛЕННАЯ функция renderListView
  const renderListView = () => {
    return (
      <>
        {/* Таблица отображается всегда, независимо от наличия данных */}
        <DynamicTable
          data={prepareTableData()}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          excludeColumns={['id', 'estimated_cost', 'appointment_time']} // Исключаем, так как appointment_time показываем в appointment_date
          customRenderers={customRenderers}
        />

        {/* Сообщение показываем только когда НЕ загружается И нет данных */}
        {!isLoading && appointments.length === 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
            <div className="px-6 py-4 text-center text-sm text-gray-500">
              {error ? (
                <div className="text-red-600">
                  <p>Ошибка: {error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAppointmentsList}
                    className="mt-2 inline-flex items-center"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Попробовать снова
                  </Button>
                </div>
              ) : (
                <>
                  <p>No appointments found</p>
                  <p className="text-xs mt-2 text-gray-400">
                    Создайте первую запись нажав кнопку "New Appointment"
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </>
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

          <div className="flex space-x-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm rounded-md"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button
              variant="outline"
              onClick={view === 'list' ? fetchAppointmentsList : fetchCalendarAppointments}
              disabled={isLoading}
              className="inline-flex items-center"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Показываем индикатор загрузки только при первой загрузке */}
        {isLoading && appointments.length === 0 && calendarAppointments.length === 0 ? (
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