import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Check, ExternalLink, GitMerge } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClusterAction {
    id: string;
    label: string;
    onClick: (selectedItemId: string, allItemIds: string[]) => Promise<void> | void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    className?: string;
}

export interface ClusterActionCategory {
    id: string;
    label: string;
    color: string;
    onClick: (selectedItemId: string, allItemIds: string[], categoryId: string) => Promise<void> | void;
}

export interface ClusterCardProps<T> {
    items: T[];
    getItemId: (item: T) => string;
    getItemTitle: (item: T) => string;
    getItemPublisher: (item: T) => string | null;
    getItemUrl?: (item: T) => string | null;
    getItemDate?: (item: T) => string | null;
    getItemScore?: (item: T) => number | null;
    actions?: ClusterAction[];
    actionCategories?: ClusterActionCategory[];
    actionCategoriesLabel?: string;
    theme?: {
        borderColor?: string;
        bgColor?: string;
        accentColor?: string;
    };
    renderItem?: (item: T, isSelected: boolean, onClick: () => void) => React.ReactNode;
    isProcessing?: boolean;
    clusterLabel?: string;
}

export function ClusterCard<T>({
    items,
    getItemId,
    getItemTitle,
    getItemPublisher,
    getItemUrl,
    getItemDate,
    getItemScore,
    actions = [],
    actionCategories = [],
    actionCategoriesLabel = "Ações:",
    theme = {
        borderColor: "border-border/40",
        bgColor: "bg-background/40 backdrop-blur-sm",
        accentColor: "bg-gradient-to-b from-blue-500 to-indigo-600"
    },
    renderItem,
    isProcessing = false,
    clusterLabel
}: ClusterCardProps<T>) {
    const [isOpen, setIsOpen] = useState(false);

    // Sort items by score if available, otherwise keep original order
    const sortedItems = getItemScore
        ? [...items].sort((a, b) => {
            const scoreA = getItemScore(a) || 0;
            const scoreB = getItemScore(b) || 0;
            return scoreB - scoreA;
        })
        : items;

    const [selectedId, setSelectedId] = useState<string>(getItemId(sortedItems[0]));
    const bestItem = sortedItems.find(i => getItemId(i) === selectedId) || sortedItems[0];
    const otherItems = items.filter(i => getItemId(i) !== getItemId(bestItem));

    const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return "Data N/A";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "Data Inválida";
            return format(d, "dd/MM HH:mm", { locale: ptBR });
        } catch {
            return "Erro na data";
        }
    };

    const defaultRenderItem = (item: T, isSelected: boolean, onClick: () => void) => {
        const publisher = getItemPublisher(item);
        const title = getItemTitle(item);
        const isBest = String(getItemId(item)) === String(getItemId(sortedItems[0]));
        const url = getItemUrl ? getItemUrl(item) : null;
        let domain = "";
        try {
            if (url) domain = new URL(url).hostname;
        } catch { }

        return (
            <div
                onClick={onClick}
                className={cn(
                    "p-3 rounded-lg text-sm border cursor-pointer transition-all flex items-center justify-between group",
                    isSelected
                        ? "bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20"
                        : "bg-card/30 border-transparent hover:bg-card/50 hover:border-border/50"
                )}
            >
                <div className="flex items-start gap-3 overflow-hidden">
                    {domain && (
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                            alt=""
                            className="w-4 h-4 mt-0.5 rounded-sm opacity-70"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    )}
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-medium leading-none truncate opacity-80">{publisher || "Sem fonte"}</span>
                            {isBest && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                    Mais Relevante
                                </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{title}</div>
                    </div>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />}
            </div>
        );
    };

    const renderItemFn = renderItem || defaultRenderItem;

    return (
        <Card className={cn("w-full shadow-sm relative overflow-hidden", theme.borderColor, theme.bgColor)}>
            <div className={cn("absolute top-0 left-0 w-1 h-full", theme.accentColor)} />

            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            <GitMerge className="h-3 w-3 mr-1" />
                            {clusterLabel || `Cluster: +${items.length - 1} similares`}
                        </Badge>
                        {getItemDate && (
                            <span className="text-xs text-muted-foreground font-mono">
                                {formatDate(getItemDate(bestItem))}
                            </span>
                        )}
                    </div>

                    <h3 className="font-semibold text-lg leading-tight tracking-tight text-foreground/90">
                        {getItemTitle(bestItem)}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getItemUrl && getItemUrl(bestItem) && (() => {
                            const url = getItemUrl(bestItem);
                            if (!url) return null;
                            try {
                                const domain = new URL(url).hostname;
                                return (
                                    <img
                                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                        alt=""
                                        className="w-3.5 h-3.5 rounded-sm opacity-70"
                                    />
                                );
                            } catch { return null; }
                        })()}
                        <span className="font-medium text-foreground/80">{getItemPublisher(bestItem) || "Sem fonte"}</span>
                        {getItemUrl && getItemUrl(bestItem) && (
                            <>
                                <span>•</span>
                                <a
                                    href={getItemUrl(bestItem)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline hover:text-primary flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Link Original <ExternalLink className="h-3 w-3" />
                                </a>
                            </>
                        )}
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
                        {sortedItems.map((item) => {
                            const itemId = getItemId(item);
                            const isSelected = itemId === selectedId;
                            return (
                                <div key={itemId}>
                                    {renderItemFn(item, isSelected, () => setSelectedId(itemId))}
                                </div>
                            );
                        })}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {(actions.length > 0 || actionCategories.length > 0) && (
                <CardContent className="pb-3 px-4">
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                        {actionCategories.length > 0 && (
                            <>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground py-1 mr-1">
                                    {actionCategoriesLabel}
                                </span>
                                {actionCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            const allIds = items.map(i => getItemId(i));
                                            cat.onClick(selectedId, allIds, cat.id);
                                        }}
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
                            </>
                        )}

                        {actions.length > 0 && (
                            <>
                                {actionCategories.length > 0 && (
                                    <div className="w-[1px] h-6 bg-border mx-1" />
                                )}
                                {actions.map(action => (
                                    <button
                                        key={action.id}
                                        onClick={() => {
                                            const allIds = items.map(i => getItemId(i));
                                            action.onClick(selectedId, allIds);
                                        }}
                                        disabled={isProcessing}
                                        className={cn(
                                            "px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                                            action.variant === "destructive" && "bg-gray-100 hover:bg-red-50 text-red-600 border-transparent hover:border-red-200",
                                            action.variant === "outline" && "bg-white hover:bg-gray-50 text-gray-700",
                                            action.className,
                                            isProcessing && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
