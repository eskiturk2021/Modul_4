// ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ: src/pages/Appointments.tsx с полной интерактивностью
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
  const [view, setView] = useState<'list' | 'calendar'>('list'); // Начинаем со списка
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarAppointments, setCalendarAppointments] = useState<CalendarAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Состояния для модального окна
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<CalendarAppointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Отладочные логи
  console.log('🔍 Appointments Debug:', {
    view,
    appointmentsCount: appointments.length,
    calendarAppointmentsCount: calendarAppointments.length,
    isLoading,
    currentMonth: format(currentMonth, 'MMMM yyyy'),
    isModalOpen,
    selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  });

  useEffect(() => {
    console.log('📅 Effect triggered:', { view, status, currentMonth: format(currentMonth, 'yyyy-MM') });

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
      console.log('📋 Загрузка списка записей...');

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

  // Обработчик клика на день в календаре
  const handleDayClick = (date: Date) => {
    console.log('🖱️ Day clicked:', format(date, 'yyyy-MM-dd'));

    const dayAppointments = calendarAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start);
      return isSameDay(appointmentDate, date);
    });

    console.log('📋 Appointments for this day:', dayAppointments);

    if (dayAppointments.length > 0) {
      setSelectedDate(date);
      setSelectedDateAppointments(dayAppointments);
      setIsModalOpen(true);
      console.log('🔓 Modal opened');
    } else {
      console.log('❌ No appointments for this day');
    }
  };

  // Обработчик клика на конкретную запись
  const handleAppointmentClick = (appointmentId: string) => {
    console.log('🖱️ Appointment clicked:', appointmentId);
    setIsModalOpen(false);
    // Переходим на страницу appointments в режиме списка вместо детальной страницы
    setView('list');
  };

  // Закрытие модального окна
  const closeModal = () => {
    console.log('❌ Modal closed');
    setIsModalOpen(false);
    setSelectedDate(null);
    setSelectedDateAppointments([]);
  };

  // Получение цвета статуса
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
      key: 'customer',
      label: 'Customer',
      render: (appointment: Appointment) => (
        <div>
          <div className="font-medium">
            {appointment.customer?.name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-500">
            {appointment.customer?.phone || ''}
          </div>
        </div>
      )
    },
    {
      key: 'service',
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
        // Исправленное форматирование времени
        const timeString = appointment.appointment_time;
        if (typeof timeString === 'string') {
          // Если это строка времени в формате "HH:MM" или "HH:MM:SS"
          if (timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
            return timeString.substring(0, 5); // Возвращаем только "HH:MM"
          }
          // Если это ISO строка с датой и временем
          try {
            const date = new Date(timeString);
            if (!isNaN(date.getTime())) {
              return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
            }
          } catch (error) {
            console.warn('Error parsing time:', timeString, error);
          }
        }
        return timeString || 'N/A';
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
        appointment.estimated_cost ? `${appointment.estimated_cost.toFixed(2)}` : '—'
    }
  ];

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    console.log('📅 Rendering calendar for:', format(currentMonth, 'MMMM yyyy'));
    console.log('📊 Calendar data:', calendarAppointments);

    return (
      <div className="bg-white rounded-lg shadow">
        {/* Модальное окно с деталями дня */}
        {isModalOpen && selectedDate && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике внутри модалки
            >
              {/* Заголовок модального окна */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  📅 {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
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
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 group hover:shadow-md"
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
                className="p-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="px-3"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2"
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
            const dayNumber = format(day, 'd');
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[120px] border-r border-b border-gray-200 p-2 relative
                  transition-all duration-200
                  ${hasAppointments
                    ? 'cursor-pointer hover:bg-blue-50 hover:shadow-inner'
                    : 'hover:bg-gray-50'
                  }
                  ${isTodayDate ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'bg-white'}
                `}
              >
                {/* Индикатор кликабельности */}
                {hasAppointments && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                )}

                <div className={`text-sm font-medium mb-1 ${
                  isTodayDate ? 'text-blue-600 font-bold' : 'text-gray-900'
                }`}>
                  {dayNumber}
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
                        className={`
                          text-xs p-1 rounded border text-left
                          ${getStatusColor(appointment.status)}
                          ${hasAppointments ? 'hover:shadow-sm transform hover:scale-105' : ''}
                          transition-all duration-150
                        `}
                        title={`${displayTime} - ${appointment.customer_name}: ${appointment.service_name}`}
                      >
                        <div className="font-medium truncate">
                          {displayTime} - {appointment.customer_name}
                        </div>
                      </div>
                    );
                  })}

                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium p-1 bg-gray-100 rounded">
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
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                console.log('🔄 Switching to list view');
                setView('list');
              }}
            >
              List View
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                console.log('🔄 Switching to calendar view');
                setView('calendar');
              }}
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
            isLoading={isLoading}
            onRowClick={(appointment) => {
              // Можно добавить переход к деталям записи
              console.log('Row clicked:', appointment);
            }}
            excludeColumns={['id']} // Исключаем ID из отображения
            customRenderers={{
              customer: (value: any, item: Appointment) => (
                <div>
                  <div className="font-medium">
                    {item.customer?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.customer?.phone || ''}
                  </div>
                </div>
              ),
              service: (value: any, item: Appointment) =>
                item.service?.name || 'Unknown Service',
              appointment_date: (value: string) => formatDate(value),
              appointment_time: (value: string) => {
                if (typeof value === 'string') {
                  // Если это строка времени в формате "HH:MM" или "HH:MM:SS"
                  if (value.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
                    return value.substring(0, 5); // Возвращаем только "HH:MM"
                  }
                  // Если это ISO строка с датой и временем
                  try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      });
                    }
                  } catch (error) {
                    console.warn('Error parsing time:', value, error);
                  }
                }
                return value || 'N/A';
              },
              status: (value: string) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  value === 'confirmed' ? 'bg-green-100 text-green-800' :
                  value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  value === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {value}
                </span>
              ),
              estimated_cost: (value: number) =>
                value ? `${value.toFixed(2)}` : '—'
            }}
          />
        </div>
      ) : (
        renderCalendarView()
      )}
    </div>
  );
}