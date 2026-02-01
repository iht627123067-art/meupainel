import { PipelineItem } from "@/types";
import { ClusterCard, ClusterAction, ClusterActionCategory } from "./ClusterCard";
import { CATEGORIES } from "./ReviewCard";

interface ClusterReviewCardProps {
    items: PipelineItem[];
    onMerge: (keepId: string, rejectIds: string[], category?: string) => Promise<void>;
    isProcessing?: boolean;
}

export function ClusterReviewCard({ items, onMerge, isProcessing }: ClusterReviewCardProps) {
    // Create action categories from CATEGORIES
    const actionCategories: ClusterActionCategory[] = CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        color: cat.color,
        onClick: async (selectedItemId: string, allItemIds: string[], categoryId: string) => {
            const rejectIds = allItemIds.filter(id => id !== selectedItemId);
            await onMerge(selectedItemId, rejectIds, categoryId);
        }
    }));

    // Create additional actions
    const actions: ClusterAction[] = [
        {
            id: "merge-only",
            label: "Apenas Mesclar (Extrair)",
            onClick: async (selectedItemId: string, allItemIds: string[]) => {
                const rejectIds = allItemIds.filter(id => id !== selectedItemId);
                await onMerge(selectedItemId, rejectIds, undefined);
            },
            variant: "outline",
            className: "bg-white hover:bg-gray-50 text-gray-700"
        },
        {
            id: "reject-all",
            label: "Rejeitar Todos",
            onClick: async (selectedItemId: string, allItemIds: string[]) => {
                // Reject all items in the cluster
                await onMerge(selectedItemId, allItemIds, "irrelevant");
            },
            variant: "destructive"
        }
    ];

    return (
        <ClusterCard
            items={items}
            getItemId={(item) => item.id}
            getItemTitle={(item) => item.title}
            getItemPublisher={(item) => item.publisher}
            getItemUrl={(item) => item.url}
            getItemDate={(item) => item.email_date || item.created_at}
            getItemScore={(item) => item.personalization_score || null}
            actionCategories={actionCategories}
            actionCategoriesLabel="Mesclar e Classificar como:"
            actions={actions}
            isProcessing={isProcessing}
            theme={{
                borderColor: "border-blue-200 dark:border-blue-900",
                bgColor: "bg-blue-50/30 dark:bg-blue-950/10",
                accentColor: "bg-blue-500/50"
            }}
        />
    );
}
