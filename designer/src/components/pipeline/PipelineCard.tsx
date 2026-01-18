import { memo } from "react";
import { Badge } from "@/components/ui/badge";
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
    Trash2,
    Eye,
    Loader2,
    Linkedin,
    FileText,
    Brain,
    Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineItem, StageId } from "@/types";
import { useNavigate } from "react-router-dom";

interface PipelineCardProps {
    item: PipelineItem;
    stageId: StageId;
    processingId: string | null;
    onExtract: (id: string, url: string) => void;
    onClassify: (id: string) => void;
    onGeneratePost: (id: string) => void;
    onMove: (id: string, stage: StageId) => void;
    onReject: (id: string) => void;
    onDelete: (id: string) => void;
    getActionLabel: (stage: StageId) => string;
    nextStage: StageId | null;
    prevStage: StageId | null;
    index: number;
}

export const PipelineCard = memo(function PipelineCard({
    item,
    stageId,
    processingId,
    onExtract,
    onClassify,
    onGeneratePost,
    onMove,
    onReject,
    onDelete,
    getActionLabel,
    nextStage,
    prevStage,
    index,
}: PipelineCardProps) {
    const navigate = useNavigate();

    return (
        <div
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
                <Badge
                    variant="secondary"
                    className="mb-2 text-[10px] px-1.5 h-5 bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20"
                >
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
                            {stageId === "pending" && (
                                <button
                                    onClick={() =>
                                        onExtract(item.id, item.clean_url || item.url)
                                    }
                                    className="p-1.5 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                    title="Extrair Conteúdo"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                </button>
                            )}

                            {/* Extracted -> Classify */}
                            {stageId === "extracted" && (
                                <button
                                    onClick={() => onClassify(item.id)}
                                    className="p-1.5 hover:text-purple-500 hover:bg-purple-500/10 rounded transition-colors"
                                    title="Classificar com IA"
                                >
                                    <Brain className="h-3.5 w-3.5" />
                                </button>
                            )}

                            {/* Classified -> Generate LinkedIn */}
                            {stageId === "classified" && (
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
                                        onClick={() => onGeneratePost(item.id)}
                                        className="p-1.5 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded transition-colors"
                                        title="Gerar Post LinkedIn"
                                    >
                                        <Linkedin className="h-3.5 w-3.5" />
                                    </button>
                                )
                            )}

                            {/* Move to Next Stage (generic) */}
                            {nextStage &&
                                stageId !== "pending" &&
                                stageId !== "extracted" && (
                                    <button
                                        onClick={() => onMove(item.id, nextStage)}
                                        className="p-1.5 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                        title={getActionLabel(stageId)}
                                    >
                                        {stageId === "approved" ? (
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
                                    onClick={() => onMove(item.id, prevStage)}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Voltar para {prevStage}
                                </DropdownMenuItem>
                            )}

                            {nextStage && (
                                <DropdownMenuItem
                                    onClick={() => onMove(item.id, nextStage)}
                                >
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    {getActionLabel(stageId)}
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={() => onReject(item.id)}
                                className="text-yellow-600"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejeitar
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => onDelete(item.id)}
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
});
