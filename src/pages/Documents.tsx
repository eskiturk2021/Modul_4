// src/pages/Documents.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Upload, RefreshCw, Filter, Download, File, Trash } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  customer?: {
    id: string;
    name: string;
  };
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [fileType, setFileType] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCustomerId, setUploadCustomerId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [customerId, fileType]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/documents', {
        params: {
          customerId: customerId || undefined,
          fileType: fileType || undefined,
          search: search || undefined,
        },
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      if (uploadCustomerId) {
        formData.append('customer_id', uploadCustomerId);
      }

      await axios.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reset form and close modal
      setSelectedFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCustomerId('');
      setUploadModalOpen(false);

      // Refresh documents list
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await axios.delete(`/api/documents/${documentId}`);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📁';
  };

  return (
    <DashboardLayout>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">Documents</h1>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <Button
            className="inline-flex items-center"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
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
                placeholder="Search documents..."
              />
            </div>
            <Button type="submit" className="ml-3">Search</Button>
          </form>

          <div className="flex space-x-2">
            <div className="relative">
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Types</option>
                <option value="pdf">PDF</option>
                <option value="image">Images</option>
                <option value="word">Word Documents</option>
                <option value="excel">Excel Spreadsheets</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Filter className="h-4 w-4" />
              </div>
            </div>

            <div className="relative">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Customers</option>
                {/* This would typically be populated from an API */}
                <option value="customer1">Customer 1</option>
                <option value="customer2">Customer 2</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <Filter className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-600">Loading documents...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {documents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <File className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading a document.</p>
                <div className="mt-6">
                  <Button
                    className="inline-flex items-center"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              </div>
            ) : (
              documents.map((document) => (
                <div key={document.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-3xl mr-3">{getFileIcon(document.file_type)}</span>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 truncate" title={document.title}>
                            {document.title}
                          </h3>
                          {document.customer && (
                            <p className="text-sm text-gray-500">
                              Customer: {document.customer.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-500 mr-2"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-500 line-clamp-2" title={document.description}>
                      {document.description || 'No description provided'}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <div>Size: {formatFileSize(document.file_size)}</div>
                      <div>Uploaded: {formatDate(document.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setUploadModalOpen(false)}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpload}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Upload Document
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                            File
                          </label>
                          <input
                            type="file"
                            id="file"
                            onChange={handleFileChange}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Title
                          </label>
                          <input
                            type="text"
                            id="title"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            id="description"
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="customerId" className="block text-sm font-medium text-gray-700">
                            Associated Customer (Optional)
                          </label>
                          <select
                            id="customerId"
                            value={uploadCustomerId}
                            onChange={(e) => setUploadCustomerId(e.target.value)}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            <option value="">None</option>
                            {/* This would typically be populated from an API */}
                            <option value="customer1">Customer 1</option>
                            <option value="customer2">Customer 2</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className={`w-full sm:w-auto sm:ml-3 ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadModalOpen(false)}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );