// src/components/dashboard/ActivityFeed.tsx

import { formatDate } from '@/lib/utils';
import { User, Clock, ShoppingBag, FileText, Settings, MoreHorizontal } from 'lucide-react';

interface Activity {
  id: string;
  message: string;
  type: string;
  created_at: string;
  customer?: {
    id: string;
    name: string;
  };
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
}

export function ActivityFeed({ activities, title = "Recent Activity" }: ActivityFeedProps) {
  // Function to get the appropriate icon based on activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="h-5 w-5 text-blue-500" />;
      case 'appointment':
        return <Clock className="h-5 w-5 text-green-500" />;
      case 'order':
        return <ShoppingBag className="h-5 w-5 text-purple-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-yellow-500" />;
      case 'settings':
        return <Settings className="h-5 w-5 text-gray-500" />;
      default:
        return <MoreHorizontal className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

      {activities.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No recent activity</p>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 ? (
                    <span
                      className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm text-gray-500">
                          {activity.customer && (
                            <a
                              href={`/customers/${activity.customer.id}`}
                              className="font-medium text-gray-900 mr-1"
                            >
                              {activity.customer.name}
                            </a>
                          )}
                          <span className="text-gray-700">{activity.message}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-4 text-center">
          <a href="/activities" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            View all activity
          </a>
        </div>
      )}
    </div>
  );
}