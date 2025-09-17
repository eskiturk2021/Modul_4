import { formatDate } from '@/lib/utils';

interface Appointment {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  service: {
    name: string;
  };
  appointment_date: string;
  appointment_time: string; // ✅ ИЗМЕНЕНО: Теперь это строка, не Date объект
  status: string;
}

interface AppointmentListProps {
  appointments: Appointment[];
  title?: string;
}

// ✅ НОВЫЙ МЕТОД: Безопасное форматирование времени
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

    // Fallback для неожиданных форматов
    console.warn('⚠️ Неожиданный формат времени в AppointmentList:', timeString);
    return timeString || '09:00';

  } catch (error) {
    console.error('❌ Ошибка форматирования времени в AppointmentList:', error);
    return '09:00';
  }
};

export function AppointmentList({ appointments, title = "Upcoming Appointments" }: AppointmentListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

      {appointments.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No appointments scheduled</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{appointment.customer.name}</div>
                    <div className="text-sm text-gray-500">{appointment.customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(appointment.appointment_date)}</div>
                    <div className="text-sm text-gray-500">
                      {/* ✅ ИСПРАВЛЕНО: Безопасное форматирование времени */}
                      {formatAppointmentTime(appointment.appointment_time)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {appointment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}