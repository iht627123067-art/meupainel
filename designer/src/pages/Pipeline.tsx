import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePipeline } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  MoreVertical,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  Sparkles,
  Loader2,
  Linkedin,
  FileText,
  Brain,
  Send,
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
  const navigate = useNavigate();

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
                        <div
                          key={item.id}
                          className={cn(
                            "glass-card p-4 animate-fade-in hover:border-primary/50 transition-all group bg-background relative shadow-sm hover:shadow-md border border-border/60",
                            !item.is_valid && "border-destructive/30"
                          )}
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          {/* Title */}
                          <h4 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
                            {item.title}
                          </h4>
                          {item.linkedin_posts && item.linkedin_posts.length > 0 && (
                            <Badge variant="secondary" className="mb-2 text-[10px] px-1.5 h-5 bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20">
                              <Linkedin className="h-3 w-3 mr-1" />
                              Post Criado
                            </Badge>
                          )}

                          {/* Publisher */}
                          {item.publisher && (
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                              {item.publisher}
                            </p>
                          )}

                          {/* Description Preview */}
                          {item.description && (
                            <p className="text-xs text-muted-foreground/80 line-clamp-3 mb-3 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
                            <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>

                            <div className="flex items-center gap-1">
                              {/* External Link */}
                              <a
                                href={item.clean_url || item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                title="Abrir artigo"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>

                              {/* Action Button - depends on stage */}
                              {processingId === item.id ? (
                                <button disabled className="p-1.5 text-primary rounded">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                </button>
                              ) : (
                                <>
                                  {/* Pending -> Extract */}
                                  {stage.id === "pending" && (
                                    <button
                                      onClick={() =>
                                        extractContent(item.id, item.clean_url || item.url)
                                      }
                                      className="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                      title="Extrair Conteúdo"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  {/* Extracted -> Classify */}
                                  {stage.id === "extracted" && (
                                    <button
                                      onClick={() => classifyContent(item.id)}
                                      className="p-1.5 hover:text-purple-500 hover:bg-purple-500/10 rounded transition-colors"
                                      title="Classificar com IA"
                                    >
                                      <Brain className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  {/* Classified -> Generate LinkedIn */}
                                  {stage.id === "classified" && (
                                    item.linkedin_posts && item.linkedin_posts.length > 0 ? (
                                      <button
                                        onClick={() => navigate("/linkedin")}
                                        className="p-1.5 text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded transition-colors"
                                        title="Ver Post no LinkedIn"
                                      >
                                        <ArrowRight className="h-3.5 w-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => generateLinkedInPost(item.id)}
                                        className="p-1.5 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded transition-colors"
                                        title="Gerar Post LinkedIn"
                                      >
                                        <Linkedin className="h-3.5 w-3.5" />
                                      </button>
                                    )
                                  )}

                                  {/* Move to Next Stage (generic) */}
                                  {nextStage &&
                                    stage.id !== "pending" &&
                                    stage.id !== "extracted" && (
                                      <button
                                        onClick={() => moveToStage(item.id, nextStage)}
                                        className="p-1.5 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                        title={getActionLabel(stage.id)}
                                      >
                                        {stage.id === "approved" ? (
                                          <Send className="h-3.5 w-3.5" />
                                        ) : (
                                          <ArrowRight className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    )}
                                </>
                              )}

                              {/* More Options */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 hover:text-primary hover:bg-primary/10 rounded transition-colors">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.open(item.clean_url || item.url, "_blank")
                                    }
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver artigo
                                  </DropdownMenuItem>

                                  {prevStage && (
                                    <DropdownMenuItem
                                      onClick={() => moveToStage(item.id, prevStage)}
                                    >
                                      <ArrowLeft className="h-4 w-4 mr-2" />
                                      Voltar para {stages.find((s) => s.id === prevStage)?.label}
                                    </DropdownMenuItem>
                                  )}

                                  {nextStage && (
                                    <DropdownMenuItem
                                      onClick={() => moveToStage(item.id, nextStage)}
                                    >
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                      {getActionLabel(stage.id)}
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => rejectItem(item.id)}
                                    className="text-yellow-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rejeitar
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => deleteItem(item.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Validation Warning */}
                          {!item.is_valid && (
                            <div className="absolute top-2 right-2">
                              <div className="text-destructive" title="URL inválida">
                                <XCircle className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                        </div>
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
