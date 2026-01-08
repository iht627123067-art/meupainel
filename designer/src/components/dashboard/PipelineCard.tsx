import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStage {
  id: string;
  label: string;
  count: number;
  isActive?: boolean;
  isCompleted?: boolean;
}

interface PipelineCardProps {
  stages: PipelineStage[];
}

export function PipelineCard({ stages }: PipelineCardProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-6">Pipeline de Processamento</h3>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center transition-all",
                  stage.isCompleted
                    ? "bg-success/20 text-success"
                    : stage.isActive
                    ? "bg-primary/20 text-primary animate-pulse-glow"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {stage.isCompleted ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>
              <span className="mt-2 text-sm font-medium">{stage.label}</span>
              <span
                className={cn(
                  "text-2xl font-bold mt-1",
                  stage.isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {stage.count}
              </span>
            </div>
            {index < stages.length - 1 && (
              <ArrowRight className="h-5 w-5 mx-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
