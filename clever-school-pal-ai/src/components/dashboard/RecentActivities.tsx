
import { Activity } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentActivitiesProps {
  activities: Activity[];
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  function getActivityIcon(activity: Activity) {
    switch (activity.type) {
      case "create":
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <span className="text-lg">+</span>
          </div>
        );
      case "update":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <span className="text-lg">⟳</span>
          </div>
        );
      case "delete":
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <span className="text-lg">−</span>
          </div>
        );
      case "login":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <span className="text-lg">→</span>
          </div>
        );
      case "message":
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
            <span className="text-lg">✉</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <span className="text-lg">•</span>
          </div>
        );
    }
  }

  function formatDate(dateString: string) {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start space-x-4 p-3 rounded-md hover:bg-muted/50 transition-colors"
        >
          {getActivityIcon(activity)}
          <div className="flex-1 min-w-0">
            <p className="text-sm">{activity.description}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">
                por {activity.createdBy}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(activity.createdAt)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RecentActivities;
