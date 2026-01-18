import { useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePipeline } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PipelineCard } from "@/components/pipeline/PipelineCard";
import {
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageId } from "@/types";

export default function Pipeline() {
  const {
    items,
    isLoading,
    isRefreshing,
    processingId,
    stages,
    totalItems,
    fetchItems,
    moveToStageAction: moveToStage,
    rejectItem,
    deleteItem,
    extractContent,
    classifyContent,
    generateLinkedInPost,
    getNextStageHelper: getNextStage,
    getPrevStageHelper: getPrevStage,
    getActionLabel,
  } = usePipeline();


  // Memoized UI handlers
  const handleRefresh = useCallback(() => {
    fetchItems(true);
  }, [fetchItems]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe o fluxo de processamento dos conteúdos
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1.5 hidden sm:flex">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Total: {totalItems} itens
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const count = items[stage.id]?.length || 0;
            return (
              <Card key={stage.id} className={cn("border shadow-sm", stage.bgColor)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <Icon className={cn("h-5 w-5", stage.color)} />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{stage.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
          <div className="flex h-full gap-4 min-w-full">
            {stages.map((stage) => {
              const Icon = stage.icon;
              const stageItems = items[stage.id] || [];

              return (
                <div
                  key={stage.id}
                  className="w-[320px] min-w-[320px] max-w-[320px] flex flex-col h-full rounded-xl bg-muted/30 border border-border/50"
                >
                  {/* Column Header */}
                  <div
                    className={cn(
                      "p-4 border-b shrink-0 flex items-center justify-between bg-background/50 backdrop-blur-sm rounded-t-xl",
                      stage.bgColor,
                      "border-b-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-5 w-5", stage.color)} />
                      <div>
                        <span className="font-semibold text-sm">{stage.label}</span>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono bg-background/80">
                      {stageItems.length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    {stageItems.map((item, index) => {
                      const nextStage = getNextStage(stage.id);
                      const prevStage = getPrevStage(stage.id);

                      return (
                        <PipelineCard
                          key={item.id}
                          item={item}
                          index={index}
                          stageId={stage.id}
                          processingId={processingId}
                          onExtract={extractContent}
                          onClassify={classifyContent}
                          onGeneratePost={generateLinkedInPost}
                          onMove={moveToStage}
                          onReject={rejectItem}
                          onDelete={deleteItem}
                          getActionLabel={getActionLabel}
                          nextStage={nextStage}
                          prevStage={prevStage}
                        />
                      );
                    })}

                    {stageItems.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg bg-background/50">
                        <Icon className={cn("h-8 w-8 mx-auto mb-2 opacity-30", stage.color)} />
                        Nenhum item
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
