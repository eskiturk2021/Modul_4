// src/pages/Documents.tsx
import { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  Plus,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { DynamicTable } from '@/components/ui/DynamicTable';
import { formatDate } from '@/lib/utils';
import apiService from '@/services/apiService';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  upload_date: string;
  customer?: {
    id: string;
    name: string;
  };
  url?: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [search, typeFilter]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📄 Загрузка документов...');

      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const response = await apiService.get<Document[]>('/api/documents', {
        params
      });

      console.log('✅ Документы загружены:', response);

      const documentsData = Array.isArray(response) ? response :
                           response.documents || response.data || [];
      setDocuments(documentsData);
    } catch (error) {
      console.error('❌ Ошибка загрузки документов:', error);
      setError('Failed to load documents. Please try again.');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('📤 Загрузка файла:', file.name);

      const response = await apiService.upload('/api/documents/upload', formData);

      console.log('✅ Файл загружен:', response);

      // Обновляем список документов
      await fetchDocuments();

      // Очищаем input
      event.target.value = '';

      alert('Document uploaded successfully!');
    } catch (error) {
      console.error('❌ Ошибка загрузки файла:', error);
      alert('Failed to upload document. Please try again.');
    }
  };

  const handleDocumentView = (document: Document) => {
    if (document.url) {
      window.open(document.url, '_blank');
    } else {
      alert('Document preview not available');
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      console.log('🗑️ Удаление документа:', documentId);

      await apiService.delete(`/api/documents/${documentId}`);

      console.log('✅ Документ удален');

      // Обновляем список документов
      await fetchDocuments();

      alert('Document deleted successfully!');
    } catch (error) {
      console.error('❌ Ошибка удаления документа:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const customRenderers = {
    name: (value: string, item: Document) => (
      <div className="flex items-center">
        <FileText className="h-5 w-5 text-gray-400 mr-2" />
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{item.type}</div>
        </div>
      </div>
    ),
    size: (value: number) => (
      <span className="text-sm text-gray-600">{formatFileSize(value)}</span>
    ),
    upload_date: (value: string) => (
      <span className="text-sm text-gray-600">{formatDate(value)}</span>
    ),
    customer: (value: any, item: Document) => (
      item.customer ? (
        <span className="text-sm text-gray-900">{item.customer.name}</span>
      ) : (
        <span className="text-sm text-gray-400 italic">No customer</span>
      )
    ),
    actions: (value: any, item: Document) => (
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDocumentView(item)}
          className="p-1"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDocumentDelete(item.id)}
          className="p-1 text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <div className="flex items-center space-x-4">
          {/* Upload button */}
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button className="inline-flex items-center">
              <Upload className="h-4 w-4 mr-1" />
              Upload Document
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
            />
          </label>
        </div>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Фильтры и поиск */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
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
              placeholder="Search documents..."
            />
          </div>
          <Button type="submit" className="ml-3">Search</Button>
        </form>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Types</option>
              <option value="pdf">PDF</option>
              <option value="doc">Word Document</option>
              <option value="xls">Excel</option>
              <option value="image">Image</option>
              <option value="other">Other</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter className="h-4 w-4" />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={fetchDocuments}
            className="inline-flex items-center px-4 py-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Таблица документов */}
      <DynamicTable
        data={documents}
        isLoading={isLoading}
        onRowClick={(document) => {
          console.log('Document clicked:', document);
          // Можно добавить открытие документа при клике на строку
        }}
        excludeColumns={['id', 'url']}
        customRenderers={{
          ...customRenderers,
          // Добавляем виртуальную колонку действий
          actions: customRenderers.actions
        }}
      />

      {/* Диагностический блок для разработки */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-bold text-blue-800">🔧 Диагностика Documents</h3>
          <div className="text-sm text-blue-700 mt-2">
            <p><strong>Загрузка:</strong> {isLoading.toString()}</p>
            <p><strong>Количество документов:</strong> {documents.length}</p>
            <p><strong>Тип данных:</strong> {Array.isArray(documents) ? 'array' : typeof documents}</p>
            <p><strong>Поиск:</strong> {search || 'не задан'}</p>
            <p><strong>Фильтр типа:</strong> {typeFilter || 'не задан'}</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">Первый документ</summary>
              <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                {JSON.stringify(documents[0] || null, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}