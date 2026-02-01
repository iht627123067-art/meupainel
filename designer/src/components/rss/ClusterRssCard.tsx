import { ClusterCard, ClusterAction } from "@/components/pipeline/ClusterCard";

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
    duplicate_group_id?: string | number;
}

interface ClusterRssCardProps {
    articles: RssArticle[];
    onImport: (selectedGuid: string, allGuids: string[], targetStatus: 'pending' | 'needs_review') => Promise<void>;
    onDiscard?: (selectedGuid: string, allGuids: string[]) => Promise<void> | void;
    isImporting?: boolean;
}

export function ClusterRssCard({ articles, onImport, onDiscard, isImporting }: ClusterRssCardProps) {
    // Create actions for RSS cluster
    const actions: ClusterAction[] = [
        {
            id: "import-pending",
            label: "Importar (Pendente)",
            onClick: async (selectedGuid: string, allGuids: string[]) => {
                await onImport(selectedGuid, allGuids, 'pending');
            },
            variant: "default",
            className: "bg-primary hover:bg-primary/90 text-primary-foreground"
        },
        {
            id: "import-review",
            label: "Importar (Revisão)",
            onClick: async (selectedGuid: string, allGuids: string[]) => {
                await onImport(selectedGuid, allGuids, 'needs_review');
            },
            variant: "outline",
            className: "bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/40"
        },
        {
            id: "discard-cluster",
            label: "Descartar Cluster",
            onClick: async (selectedGuid: string, allGuids: string[]) => {
                if (onDiscard) {
                    await onDiscard(selectedGuid, allGuids);
                }
            },
            variant: "destructive"
        }
    ];

    return (
        <ClusterCard
            items={articles}
            getItemId={(article) => article.guid}
            getItemTitle={(article) => article.title}
            getItemPublisher={(article) => article.publisher}
            getItemUrl={(article) => article.url}
            getItemDate={(article) => article.published_at}
            getItemScore={() => null} // RSS articles don't have scores yet
            actions={actions}
            isProcessing={isImporting}
            clusterLabel={`Cluster: +${articles.length - 1} similares`}
            theme={{
                borderColor: "border-orange-200/40 dark:border-orange-900/40",
                bgColor: "bg-orange-50/10 dark:bg-orange-950/10 backdrop-blur-sm",
                accentColor: "bg-gradient-to-b from-orange-500 to-amber-600"
            }}
        />
    );
}
