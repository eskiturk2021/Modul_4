// src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Save, Plus, Trash, Edit, RotateCcw, Check } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
}


export default function Settings() {
  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState<Partial<Service>>({
    name: '',
    description: '',
    duration: 60,
    price: 0,
    category: 'maintenance',
  });

  // System prompt state
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState('');
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [hasPromptChanges, setHasPromptChanges] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      console.log("Начинаем загрузку сервисов");
      setIsLoadingServices(true);
      try {
        const response = await axios.get('/api/settings/services');
        console.log("Ответ при загрузке сервисов:", response.data);
        setServices(response.data.services || []);
      } catch (error) {
        console.error('Error fetching services:', error);
        console.log("Детали ошибки:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      } finally {
        setIsLoadingServices(false);
        console.log("Завершение загрузки сервисов");
      }
    };

    fetchServices();
  }, []);

  // Fetch system prompt
  useEffect(() => {
    const fetchSystemPrompt = async () => {
      console.log("Начинаем загрузку системного промпта");
      setIsLoadingPrompt(true);
      try {
        console.log("Пытаемся получить системный промпт с URL: /api/settings/system");
        const response = await axios.get('/api/settings/system');
        console.log("Ответ при загрузке системного промпта:", response.data);

        const promptText = response.data.system_prompt || "";
        setCurrentSystemPrompt(promptText);
        setEditedSystemPrompt(promptText);
        setHasPromptChanges(false);
      } catch (error) {
        console.error("Ошибка при загрузке системного промпта:", error);
        console.log("Детали ошибки:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });

        // Пробуем альтернативный URL
        try {
          console.log("Пытаемся получить системный промпт с альтернативного URL: /api/system/prompt");
          const altResponse = await axios.get('/api/system/prompt');
          console.log("Ответ с альтернативного URL:", altResponse.data);

          const promptText = altResponse.data.content || "";
          setCurrentSystemPrompt(promptText);
          setEditedSystemPrompt(promptText);
          setHasPromptChanges(false);
        } catch (altError) {
          console.error("Ошибка при загрузке с альтернативного URL:", altError);
        }
      } finally {
        setIsLoadingPrompt(false);
        console.log("Завершение загрузки системного промпта");
      }
    };

    fetchSystemPrompt();
  }, []);

  // Check for changes in system prompt
  useEffect(() => {
    setHasPromptChanges(currentSystemPrompt !== editedSystemPrompt);
  }, [currentSystemPrompt, editedSystemPrompt]);

  // Handle creating a new service
  const handleCreateService = async () => {
    try {
      const response = await axios.post('/api/services', newService);
      setServices([...services, { ...newService, id: response.data.id } as Service]);
      setNewService({
        name: '',
        description: '',
        duration: 60,
        price: 0,
        category: 'maintenance',
      });
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  // Handle updating a service
  const handleUpdateService = async () => {
    if (!editingService) return;

    try {
      await axios.put(`/api/services/${editingService.id}`, editingService);
      setServices(services.map(service =>
        service.id === editingService.id ? editingService : service
      ));
      setEditingService(null);
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  // Handle deleting a service
  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    try {
      await axios.delete(`/api/services/${serviceId}`);
      setServices(services.filter(service => service.id !== serviceId));
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  // Handle resetting system prompt to original
  const handleResetPrompt = () => {
    setEditedSystemPrompt(currentSystemPrompt);
    setHasPromptChanges(false);
  };

  // Handle saving system prompt
  const handleSavePrompt = async () => {
    console.log("Начинаем сохранение системного промпта:", editedSystemPrompt);
    setIsSavingPrompt(true);

    try {
      console.log("Отправляем запрос на URL:", '/api/settings/system/prompt');
      console.log("Данные запроса:", { content: editedSystemPrompt });

      // Попробуем отправить на первый возможный URL
      try {
        console.log("Пытаемся отправить на первый URL: /api/settings/system/prompt");
        const response = await axios.put('/api/settings/system/prompt', { content: editedSystemPrompt });
        console.log("Успешный ответ от /api/settings/system/prompt:", response.data);

        // Обновляем текущий промпт после успешного сохранения
        setCurrentSystemPrompt(editedSystemPrompt);
        setHasPromptChanges(false);

        // Показываем сообщение об успехе
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        return;
      } catch (firstError) {
        console.error("Ошибка при отправке на /api/settings/system/prompt:", firstError);
        console.log("Детали ошибки:", {
          status: firstError.response?.status,
          statusText: firstError.response?.statusText,
          data: firstError.response?.data,
          headers: firstError.response?.headers
        });

        // Если первый URL не сработал, пробуем второй
        console.log("Пытаемся отправить на второй URL: /api/system/prompt");
        try {
          const response = await axios.put('/api/system/prompt', { content: editedSystemPrompt });
          console.log("Успешный ответ от /api/system/prompt:", response.data);

          // Обновляем текущий промпт после успешного сохранения
          setCurrentSystemPrompt(editedSystemPrompt);
          setHasPromptChanges(false);

          // Показываем сообщение об успехе
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);

          return;
        } catch (secondError) {
          console.error("Ошибка при отправке на /api/system/prompt:", secondError);
          console.log("Детали ошибки:", {
            status: secondError.response?.status,
            statusText: secondError.response?.statusText,
            data: secondError.response?.data,
            headers: secondError.response?.headers
          });

          throw secondError; // Пробрасываем ошибку дальше для общей обработки
        }
      }
    } catch (error) {
      console.error("Общая ошибка при обновлении системного промпта:", error);
      console.log("Детали ошибки:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      // Проверим базовый URL и настройки axios
      console.log("Конфигурация axios:", {
        baseURL: axios.defaults.baseURL,
        headers: axios.defaults.headers
      });

      alert('Failed to update system prompt: ' + error.message);
    } finally {
      setIsSavingPrompt(false);
      console.log("Завершение процесса сохранения промпта");
    }
  };

  return (
    <>
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">Settings</h1>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="system-prompt">
          <TabsList className="mb-6">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900">Services Configuration</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage the services your business offers, including pricing and duration.
                </p>

                {isLoadingServices ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                    <span className="ml-2 text-gray-600">Loading services...</span>
                  </div>
                ) : (
                  <>
                    <div className="mt-6 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {services.map((service) => (
                            <tr key={service.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingService?.id === service.id ? (
                                  <input
                                    type="text"
                                    value={editingService.name}
                                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-gray-900">{service.name}</div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {editingService?.id === service.id ? (
                                  <textarea
                                    value={editingService.description}
                                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    rows={2}
                                  />
                                ) : (
                                  <div className="text-sm text-gray-500">{service.description}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingService?.id === service.id ? (
                                  <input
                                    type="number"
                                    value={editingService.duration}
                                    onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900">{service.duration} min</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingService?.id === service.id ? (
                                  <input
                                    type="number"
                                    value={editingService.price}
                                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                                    step="0.01"
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900">${service.price.toFixed(2)}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingService?.id === service.id ? (
                                  <select
                                    value={editingService.category}
                                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                                    className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                  >
                                    <option value="maintenance">Maintenance</option>
                                    <option value="repair">Repair</option>
                                    <option value="installation">Installation</option>
                                    <option value="consultation">Consultation</option>
                                  </select>
                                ) : (
                                  <div className="text-sm text-gray-900">{service.category}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {editingService?.id === service.id ? (
                                  <div className="flex space-x-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingService(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={handleUpdateService}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex space-x-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setEditingService({ ...service })}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteService(service.id)}
                                      className="text-red-600 hover:text-red-800 border-red-300 hover:border-red-500"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}

                          {/* New Service Form */}
                          <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={newService.name}
                                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                placeholder="Service name"
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                value={newService.description}
                                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                placeholder="Description"
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                rows={2}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={newService.duration}
                                onChange={(e) => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                                placeholder="Duration (min)"
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={newService.price}
                                onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                                step="0.01"
                                placeholder="Price"
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={newService.category}
                                onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              >
                                <option value="maintenance">Maintenance</option>
                                <option value="repair">Repair</option>
                                <option value="installation">Installation</option>
                                <option value="consultation">Consultation</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                onClick={handleCreateService}
                                disabled={!newService.name}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* System Prompt Tab */}
          <TabsContent value="system-prompt">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900">System Prompt Configuration</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Configure the AI assistant's behavior by modifying the system prompt. This defines how the assistant interacts with your customers.
                </p>

                {isLoadingPrompt ? (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                    <span className="ml-2 text-gray-600">Loading system prompt...</span>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="mb-4">
                      <h3 className="text-md font-medium text-gray-900 mb-2">Current System Prompt</h3>
                      <div className="p-4 bg-gray-50 rounded-md border border-gray-200 h-48 overflow-y-auto">
                        <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700">{currentSystemPrompt}</pre>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-md font-medium text-gray-900">Edit System Prompt</h3>
                        {hasPromptChanges && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetPrompt}
                            className="flex items-center"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset Changes
                          </Button>
                        )}
                      </div>
                      <textarea
                        value={editedSystemPrompt}
                        onChange={(e) => setEditedSystemPrompt(e.target.value)}
                        className="block w-full h-96 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                      />
                    </div>

                    <div className="mt-4 flex items-center">
                      <Button
                        onClick={handleSavePrompt}
                        disabled={isSavingPrompt || !hasPromptChanges}
                        className="inline-flex items-center"
                      >
                        {isSavingPrompt ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save System Prompt
                          </>
                        )}
                      </Button>

                      {showSuccessMessage && (
                        <div className="ml-4 flex items-center text-green-600">
                          <Check className="h-5 w-5 mr-1" />
                          Prompt successfully updated
                        </div>
                      )}

                      {hasPromptChanges && (
                        <div className="ml-4 text-sm text-amber-600">
                          You have unsaved changes
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Configure general settings for your customer management dashboard.
                </p>

                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-900">Business Hours</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Set your business hours for appointment scheduling.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="opening-time" className="block text-sm font-medium text-gray-700">
                          Opening Time
                        </label>
                        <select
                          id="opening-time"
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          defaultValue="08:00"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => (
                            <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                              {hour}:00 AM
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="closing-time" className="block text-sm font-medium text-gray-700">
                          Closing Time
                        </label>
                        <select
                          id="closing-time"
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          defaultValue="18:00"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 12).map((hour) => (
                            <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                              {hour > 12 ? hour - 12 : hour}:00 PM
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium text-gray-900">Notification Settings</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure how and when you receive notifications.
                    </p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center">
                        <input
                          id="email-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="email-notifications" className="ml-2 block text-sm text-gray-700">
                          Email notifications for new appointments
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="sms-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="sms-notifications" className="ml-2 block text-sm text-gray-700">
                          SMS notifications for new appointments
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="browser-notifications"
                          type="checkbox"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="browser-notifications" className="ml-2 block text-sm text-gray-700">
                          Browser notifications
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-200">
                    <div className="flex justify-end">
                      <Button>
                        Save Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}