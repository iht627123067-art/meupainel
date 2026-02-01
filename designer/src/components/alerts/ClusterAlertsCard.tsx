import { Alert } from "@/types";
import { ClusterCard, ClusterAction } from "@/components/pipeline/ClusterCard";

interface ClusterAlertsCardProps {
    items: Alert[];
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onApproveCluster?: (selectedId: string, allIds: string[]) => Promise<void>;
    onRejectCluster?: (allIds: string[]) => Promise<void>;
    isProcessing?: boolean;
}

export function ClusterAlertsCard({ 
    items, 
    onApprove, 
    onReject,
    onApproveCluster,
    onRejectCluster,
    isProcessing 
}: ClusterAlertsCardProps) {
    // Create actions for cluster
    const actions: ClusterAction[] = [
        {
            id: "approve-cluster",
            label: "Aprovar Cluster (Melhor Item)",
            onClick: async (selectedItemId: string, allItemIds: string[]) => {
                if (onApproveCluster) {
                    await onApproveCluster(selectedItemId, allItemIds);
                } else {
                    // Fallback: approve selected, reject others
                    await onApprove(selectedItemId);
                    const rejectIds = allItemIds.filter(id => id !== selectedItemId);
                    for (const id of rejectIds) {
                        await onReject(id);
                    }
                }
            },
            variant: "default",
            className: "bg-green-600 hover:bg-green-700 text-white border-transparent"
        },
        {
            id: "reject-cluster",
            label: "Rejeitar Cluster",
            onClick: async (selectedItemId: string, allItemIds: string[]) => {
                if (onRejectCluster) {
                    await onRejectCluster(allItemIds);
                } else {
                    // Fallback: reject all
                    for (const id of allItemIds) {
                        await onReject(id);
                    }
                }
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
            getItemUrl={(item) => item.clean_url || item.url}
            getItemDate={(item) => item.email_date || item.created_at}
            getItemScore={(item) => item.personalization_score || null}
            actions={actions}
            isProcessing={isProcessing}
            theme={{
                borderColor: "border-orange-200 dark:border-orange-900",
                bgColor: "bg-orange-50/30 dark:bg-orange-950/10",
                accentColor: "bg-orange-500/50"
            }}
        />
    );
}
