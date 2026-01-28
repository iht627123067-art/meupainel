import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PipelineItem } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink, GitMerge, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./ReviewCard";

interface ClusterReviewCardProps {
    items: PipelineItem[];
    onMerge: (keepId: string, rejectIds: string[], category?: string) => Promise<void>;
    isProcessing?: boolean;
}

export function ClusterReviewCard({ items, onMerge, isProcessing }: ClusterReviewCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string>(items[0]?.id);

    // Sort items by score (highest first) to suggest the best one
    const sortedItems = [...items].sort((a, b) => (b.personalization_score || 0) - (a.personalization_score || 0));
    const bestItem = sortedItems.find(i => i.id === selectedId) || sortedItems[0];
    const otherItems = items.filter(i => i.id !== bestItem.id);

    const handleMerge = async (category?: string) => {
        const rejectIds = otherItems.map(i => i.id);
        await onMerge(bestItem.id, rejectIds, category);
    };

    return (
        <Card className="w-full border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />

            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            <GitMerge className="h-3 w-3 mr-1" />
                            Cluster: +{items.length - 1} similares
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(bestItem.email_date || bestItem.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                    </div>

                    <h3 className="font-semibold text-lg leading-tight tracking-tight text-foreground/90">
                        {bestItem.title}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{bestItem.publisher}</span>
                        <span>•</span>
                        <a href={bestItem.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary flex items-center gap-1">
                            Link Original <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[120px]">
                    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                                Ver todas ({items.length})
                                {isOpen ? <ChevronUp className="h-3 w-3 ml-2" /> : <ChevronDown className="h-3 w-3 ml-2" />}
                            </Button>
                        </CollapsibleTrigger>
                    </Collapsible>
                </div>
            </CardHeader>

            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Selecione a melhor versão para manter:
                        </p>
                        {sortedItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedId(item.id)}
                                className={cn(
                                    "p-3 rounded-md text-sm border cursor-pointer transition-all flex items-center justify-between group",
                                    selectedId === item.id
                                        ? "bg-background border-primary shadow-sm ring-1 ring-primary"
                                        : "bg-background/50 border-transparent hover:bg-background hover:border-border"
                                )}
                            >
                                <div className="space-y-1">
                                    <div className="font-medium leading-none">{item.publisher}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-1">{item.title}</div>
                                </div>
                                {selectedId === item.id && <Check className="h-4 w-4 text-primary" />}
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <CardContent className="pb-3 px-4">
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground py-1 mr-1">
                        Mesclar e Classificar como:
                    </span>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleMerge(cat.id)}
                            disabled={isProcessing}
                            className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                                cat.color,
                                isProcessing && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                    <div className="w-[1px] h-6 bg-border mx-1" />
                    <button
                        onClick={() => handleMerge(undefined)}
                        // Undefined category means just merge to extracted (or needs logic adjustment)
                        // Actually, if we merge without classifying, we probably move to needs_review?
                        // Let's assume user must classify to merge for now, or add "Mesclar e Extrair"
                        className="px-2.5 py-1 text-xs font-medium rounded-full border bg-white hover:bg-gray-50 text-gray-700"
                    >
                        Apenas Mesclar (Extrair)
                    </button>
                    <button
                        onClick={() => onMerge(bestItem.id, sortedItems.map(i => i.id), "irrelevant")}
                        className="px-2.5 py-1 text-xs font-medium rounded-full border bg-gray-100 hover:bg-red-50 text-red-600 border-transparent hover:border-red-200"
                    >
                        Rejeitar Todos
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}
