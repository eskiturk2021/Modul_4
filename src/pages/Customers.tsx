// src/pages/Customers.tsx - Полностью переписанная версия
import { useState, useEffect } from 'react';
import api from '@/services/apiService';
import { Link } from 'react-router-dom';
import { Search, Plus, RefreshCw, Filter, Download } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { DynamicTable } from '@/components/ui/DynamicTable';
import { formatDate } from '@/lib/utils';

interface Customer {
  [key: string]: any; // Позволяем любые поля
}

interface ApiResponse {
  customers?: Customer[];
  data?: Customer[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    from: number;
    to: number;
    total: number;
  };
  [key: string]: any;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    from: 0,
    to: 0,
    total: 0,
  });

  useEffect(() => {
    fetchCustomers();
  }, [pagination.currentPage, status]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Загрузка клиентов с параметрами:', {
        page: pagination.currentPage,
        status: status || undefined,
        search: search || undefined,
      });

      const response = await api.get('/api/customers', {
        params: {
          page: pagination.currentPage,
          status: status || undefined,
          search: search || undefined,
        },
      });

      console.log('📊 Полный ответ API:', response);

      // Универсальная обработка ответа
      const processApiResponse = (data: any): { customers: Customer[], pagination: any } => {
        // Случай 1: Данные в data.customers
        if (data?.customers && Array.isArray(data.customers)) {
          return {
            customers: data.customers,
            pagination: data.pagination || {}
          };
        }

        // Случай 2: Данные в data.data
        if (data?.data && Array.isArray(data.data)) {
          return {
            customers: data.data,
            pagination: data.pagination || {}
          };
        }

        // Случай 3: Данные напрямую в массиве
        if (Array.isArray(data)) {
          return {
            customers: data,
            pagination: {
              currentPage: 1,
              totalPages: 1,
              from: 1,
              to: data.length,
              total: data.length
            }
          };
        }

        // Случай 4: Попробуем найти массив в любом поле
        for (const [key, value] of Object.entries(data || {})) {
          if (Array.isArray(value) && value.length > 0) {
            console.log(`📋 Найден массив данных в поле: ${key}`);
            return {
              customers: value,
              pagination: data.pagination || {}
            };
          }
        }

        console.warn('⚠️ Не удалось найти данные клиентов в ответе:', data);
        return { customers: [], pagination: {} };
      };

      const { customers: fetchedCustomers, pagination: fetchedPagination } = processApiResponse(response.data || response);

      console.log('✅ Обработанные данные:', {
        customersCount: fetchedCustomers.length,
        firstCustomer: fetchedCustomers[0],
        pagination: fetchedPagination
      });

      setCustomers(fetchedCustomers);
      setPagination({
        currentPage: fetchedPagination.currentPage || 1,
        totalPages: fetchedPagination.totalPages || 1,
        from: fetchedPagination.from || (fetchedCustomers.length > 0 ? 1 : 0),
        to: fetchedPagination.to || fetchedCustomers.length,
        total: fetchedPagination.total || fetchedCustomers.length,
      });

    } catch (error) {
      console.error('❌ Ошибка при получении клиентов:', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/customers/export', {
        params: {
          format: 'csv',
        },
      });

      // Create a hidden anchor element to trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = response.data.url;
      a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting customers:', error);
    }
  };

  // Кастомные рендереры для специфических полей
  const customRenderers = {
    // Рендер имени клиента с инициалами
    name: (value: string, item: Customer) => (
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
            {value ? value.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
          </div>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{value}</div>
        </div>
      </div>
    ),

    // Рендер контактной информации
    phone: (value: string) => (
      <a
        href={`tel:${value}`}
        className="text-blue-600 hover:text-blue-800 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {value}
      </a>
    ),

    // Рендер информации об автомобиле
    vehicle_info: (value: any, item: Customer) => {
      const make = item.vehicle_make;
      const model = item.vehicle_model;
      const year = item.vehicle_year;

      if (!make && !model && !year) {
        return <span className="text-gray-400 italic">Not specified</span>;
      }

      return (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {make} {model}
          </div>
          {year && <div className="text-gray-500">{year}</div>}
        </div>
      );
    }
  };

  return (
    <>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">Customers</h1>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <Link to="/customers/new">
            <Button className="inline-flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4 mb-6">
          <form onSubmit={handleSearch} className="flex w-full md:w-2/3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search customers..."
              />
            </div>
            <Button type="submit" className="ml-3">Search</Button>
          </form>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="new">New</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Filter className="h-4 w-4" />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Универсальная таблица */}
        <DynamicTable
          data={customers}
          isLoading={isLoading}
          onRowClick={(customer) => {
            // Переход к деталям клиента
            console.log('Клик по клиенту:', customer);
            // window.location.href = `/customers/${customer.id || customer.customer_id}`;
          }}
          excludeColumns={['vehicle_make', 'vehicle_model', 'vehicle_year']} // Исключаем отдельные поля автомобиля
          customRenderers={{
            ...customRenderers,
            // Добавляем виртуальное поле для автомобиля
            vehicle_info: customRenderers.vehicle_info
          }}
        />

        {/* Пагинация */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 mt-4">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                disabled={pagination.currentPage === 1}
                variant="outline"
              >
                Previous
              </Button>
              <Button
                onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                disabled={pagination.currentPage === pagination.totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pagination.from}</span> to{' '}
                  <span className="font-medium">{pagination.to}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setPagination({ ...pagination, currentPage: page })}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pagination.currentPage
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Диагностический блок */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-bold text-blue-800">🔧 Диагностика</h3>
            <div className="text-sm text-blue-700 mt-2">
              <p><strong>Загрузка:</strong> {isLoading.toString()}</p>
              <p><strong>Количество клиентов:</strong> {customers.length}</p>
              <p><strong>Тип данных:</strong> {Array.isArray(customers) ? 'array' : typeof customers}</p>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">Первый клиент</summary>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                  {JSON.stringify(customers[0] || null, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </>
  );
}