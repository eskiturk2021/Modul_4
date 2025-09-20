// ✅ УЛУЧШЕННАЯ ВЕРСИЯ: src/pages/Appointments.tsx с интерактивным календарем
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Calendar, RefreshCw, Filter, ChevronLeft, ChevronRight, X, Clock, User, Briefcase } from 'lucide-react';
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
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarAppointments, setCalendarAppointments] = useState<CalendarAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ✅ НОВОЕ: Состояния для модального окна
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<CalendarAppointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      const appointmentsData = Array.isArray(response) ? response : [];
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('❌ Ошибка загрузки записей:', error);
      setError('Failed to load appointments. Please try again.');
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

      const calendarData = Array.isArray(response) ? response : [];
      setCalendarAppointments(calendarData);
    } catch (error) {
      console.error('❌ Ошибка загрузки календаря:', error);
      setError('Failed to load calendar data. Please try again.');
      setCalendarAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ НОВОЕ: Обработчик клика на день в календаре
  const handleDayClick = (date: Date) => {
    const dayAppointments = calendarAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start);
      return isSameDay(appointmentDate, date);
    });

    if (dayAppointments.length > 0) {
      setSelectedDate(date);
      setSelectedDateAppointments(dayAppointments);
      setIsModalOpen(true);
    }
  };

  // ✅ НОВОЕ: Обработчик клика на конкретную запись
  const handleAppointmentClick = (appointmentId: string) => {
    setIsModalOpen(false);
    navigate(`/appointments/${appointmentId}`);
  };

  // ✅ НОВОЕ: Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setSelectedDateAppointments([]);
  };

  // ✅ НОВОЕ: Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getColumns = () => [
    {
      key: 'customer.name',
      label: 'Customer',
      render: (appointment: Appointment) => (
        <div>
          <div className="font-medium">{appointment.customer?.name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{appointment.customer?.phone || ''}</div>
        </div>
      )
    },
    {
      key: 'service.name',
      label: 'Service',
      render: (appointment: Appointment) => appointment.service?.name || 'Unknown Service'
    },
    {
      key: 'appointment_date',
      label: 'Date',
      render: (appointment: Appointment) => formatDate(appointment.appointment_date)
    },
    {
      key: 'appointment_time',
      label: 'Time',
      render: (appointment: Appointment) => {
        if (typeof appointment.appointment_time === 'string') {
          return appointment.appointment_time;
        }
        return 'Invalid time';
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (appointment: Appointment) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {appointment.status}
        </span>
      )
    },
    {
      key: 'estimated_cost',
      label: 'Cost',
      render: (appointment: Appointment) =>
        appointment.estimated_cost ? `$${appointment.estimated_cost.toFixed(2)}` : '-'
    }
  ];

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="bg-white rounded-lg shadow">
        {/* ✅ НОВОЕ: Модальное окно с деталями дня */}
        {isModalOpen && selectedDate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              {/* Заголовок модального окна */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  📅 {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Список записей */}
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {selectedDateAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      onClick={() => handleAppointmentClick(appointment.id)}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Время */}
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(appointment.start).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                            {appointment.end && (
                              <>
                                {' - '}
                                {new Date(appointment.end).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </>
                            )}
                          </div>

                          {/* Клиент */}
                          <div className="flex items-center mb-2">
                            <User className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {appointment.customer_name}
                            </span>
                          </div>

                          {/* Услуга */}
                          <div className="flex items-center mb-3">
                            <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-gray-700">
                              {appointment.service_name}
                            </span>
                          </div>

                          {/* Статус */}
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>

                        {/* Стрелка при наведении */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Футер модального окна */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{selectedDateAppointments.length} appointment(s) on this day</span>
                  <span className="text-xs">Click on any appointment to view details</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Заголовок календаря */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="px-3 py-2 text-center text-sm font-medium text-gray-700 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Календарная сетка */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayAppointments = calendarAppointments.filter(appointment => {
              const appointmentDate = new Date(appointment.start);
              return isSameDay(appointmentDate, day);
            });

            const hasAppointments = dayAppointments.length > 0;

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                  hasAppointments ? 'cursor-pointer hover:bg-blue-50' : ''
                } ${isToday(day) ? 'bg-blue-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday(day) ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => {
                    const displayTime = new Date(appointment.start).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });

                    return (
                      <div
                        key={appointment.id}
                        className={`text-xs p-1 rounded border ${getStatusColor(appointment.status)} ${
                          hasAppointments ? 'hover:shadow-sm' : ''
                        }`}
                        title={`${displayTime} - ${appointment.title}`}
                      >
                        {displayTime} - {appointment.customer_name}
                      </div>
                    );
                  })}

                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">
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
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointmentsList}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          <DynamicTable
            data={appointments}
            columns={getColumns()}
            loading={isLoading}
            emptyMessage="No appointments found"
          />
        </div>
      ) : (
        renderCalendarView()
      )}
    </div>
  );
}