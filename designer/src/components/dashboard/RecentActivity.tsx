import { Mail, Rss, CheckCircle, Linkedin, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "email" | "rss" | "approved" | "linkedin" | "research";
  title: string;
  description: string;
  time: string;
}

const activityIcons = {
  email: Mail,
  rss: Rss,
  approved: CheckCircle,
  linkedin: Linkedin,
  research: FileText,
};

const activityColors = {
  email: "text-info",
  rss: "text-warning",
  approved: "text-success",
  linkedin: "text-info",
  research: "text-accent",
};

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type];
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={cn(
                  "p-2 rounded-lg bg-muted",
                  activityColors[activity.type]
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
