import { ClusterCard, ClusterAction } from "./ClusterCard";
import { cn } from "@/lib/utils";

interface RssArticle {
    title: string;
    description: string | null;
    url: string;
    source_url: string | null;
    publisher: string | null;
    published_at: string;
    guid: string;
    image_url: string | null;
    categories: string[];
    is_duplicate: boolean;
}

interface ClusterRssCardProps {
    items: RssArticle[];
    onImport: (selectedGuids: string[], targetStatus: 'pending' | 'needs_review') => Promise<void>;
    onDiscard?: (allGuids: string[]) => Promise<void>;
    isProcessing?: boolean;
}

export function ClusterRssCard({ items, onImport, onDiscard, isProcessing }: ClusterRssCardProps) {
    // Create import actions
    const actions: ClusterAction[] = [
        {
            id: "import-selected",
            label: "Importar Melhor Item",
            onClick: async (selectedGuid: string) => {
                await onImport([selectedGuid], 'pending');
            },
            variant: "default",
            className: "bg-primary hover:bg-primary/90 text-primary-foreground"
        },
        {
            id: "import-selected-review",
            label: "Revisar Melhor Item",
            onClick: async (selectedGuid: string) => {
                await onImport([selectedGuid], 'needs_review');
            },
            variant: "outline",
            className: "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/40"
        },
        {
            id: "import-all",
            label: "Importar Todos",
            onClick: async (selectedGuid: string, allGuids: string[]) => {
                await onImport(allGuids, 'pending');
            },
            variant: "outline",
            className: "bg-white hover:bg-gray-50 text-gray-700"
        },
        {
            id: "discard-cluster",
            label: "Descartar Cluster",
            onClick: async (selectedGuid: string, allGuids: string[]) => {
                if (onDiscard) {
                    await onDiscard(allGuids);
                } else {
                    // If no discard handler, mark all as duplicates by importing none
                    // This is a fallback - the parent should handle this
                    await onImport([], 'pending');
                }
            },
            variant: "destructive"
        }
    ];

    return (
        <ClusterCard
            items={items}
            getItemId={(item) => item.guid}
            getItemTitle={(item) => item.title}
            getItemPublisher={(item) => item.publisher}
            getItemUrl={(item) => item.url}
            getItemDate={(item) => item.published_at}
            getItemScore={(item) => {
                // Score based on recency and publisher reliability
                // More recent articles get higher score
                const date = new Date(item.published_at);
                const now = new Date();
                const hoursAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                // Newer articles (0-24h) get score 100, older get less
                const recencyScore = Math.max(0, 100 - hoursAgo * 2);
                return recencyScore;
            }}
            actions={actions}
            isProcessing={isProcessing}
            theme={{
                borderColor: "border-orange-200 dark:border-orange-900",
                bgColor: "bg-orange-50/30 dark:bg-orange-950/10",
                accentColor: "bg-orange-500/50"
            }}
            clusterLabel={`Cluster RSS: +${items.length - 1} similares`}
            renderItem={(item, isSelected, onClick) => {
                const formatTimeAgo = (dateStr: string): string => {
                    const date = new Date(dateStr);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);

                    if (diffMins < 60) return `há ${diffMins} min`;
                    if (diffHours < 24) return `há ${diffHours}h`;
                    return `há ${Math.floor(diffHours / 24)} dias`;
                };

                return (
                    <div
                        onClick={onClick}
                        className={cn(
                            "p-3 rounded-md text-sm border cursor-pointer transition-all",
                            isSelected
                                ? "bg-background border-primary shadow-sm ring-1 ring-primary"
                                : "bg-background/50 border-transparent hover:bg-background hover:border-border"
                        )}
                    >
                        <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium leading-tight line-clamp-2 mb-1">
                                        {item.title}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{item.publisher || "Sem fonte"}</span>
                                        <span>•</span>
                                        <span>{formatTimeAgo(item.published_at)}</span>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="shrink-0 text-primary">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                </p>
                            )}
                            {item.categories && item.categories.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                    {item.categories.slice(0, 3).map((cat, idx) => (
                                        <span
                                            key={idx}
                                            className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50"
                                        >
                                            {cat}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }}
        />
    );
}
