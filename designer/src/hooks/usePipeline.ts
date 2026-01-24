import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    PIPELINE_STAGES,
    STAGE_LABELS,
    ACTION_LABELS,
    CLASSIFICATION_LABELS,
    TOAST_MESSAGES,
} from "@/constants";
import type { PipelineItem, StageId } from "@/types";

// Import services
import {
    fetchAlerts,
    groupAlertsByStatus,
    advanceAlert,
    rejectAlert,
    removeAlert,
    retryAlert,
    moveToStage,
    getNextStage,
    getPrevStage,
    ExtractionError,
    ClassificationError,
} from "@/services";
import { supabase } from "@/integrations/supabase/client";

export interface UsePipelineReturn {
    // State
    items: { [key: string]: PipelineItem[] };
    isLoading: boolean;
    isRefreshing: boolean;
    processingId: string | null;
    stages: typeof PIPELINE_STAGES;
    totalItems: number;

    // Actions
    fetchItems: (showRefresh?: boolean) => Promise<void>;
    moveToStageAction: (id: string, newStatus: StageId) => Promise<void>;
    rejectItem: (id: string) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    extractContent: (id: string, url: string) => Promise<void>;
    classifyContent: (id: string) => Promise<void>;
    generateLinkedInPost: (id: string) => Promise<void>;
    retryItem: (id: string, url?: string) => Promise<void>;

    // Helpers
    getNextStageHelper: (currentStage: StageId) => StageId | null;
    getPrevStageHelper: (currentStage: StageId) => StageId | null;
    getActionLabel: (stageId: StageId) => string;
}

/**
 * Custom hook for managing pipeline workflow
 * Refactored to use service layer for better separation of concerns
 */
export function usePipeline(): UsePipelineReturn {
    const [items, setItems] = useState<{ [key: string]: PipelineItem[] }>({
        pending: [],
        extracted: [],
        classified: [],
        approved: [],
        published: [],
        needs_review: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();

    // Memoized fetch function
    const fetchItems = useCallback(
        async (showRefresh = false) => {
            if (showRefresh) setIsRefreshing(true);
            else setIsLoading(true);

            try {
                const alerts = await fetchAlerts({
                    statusFilter: [
                        "pending",
                        "extracted",
                        "classified",
                        "approved",
                        "published",
                        "needs_review",
                    ],
                    select: "id, title, description, publisher, status, created_at, url, source_url, clean_url, is_valid, linkedin_posts(id, status, created_at)"
                });
                const grouped = groupAlertsByStatus(alerts);
                setItems(grouped);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_LOAD_PIPELINE,
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [toast]
    );

    // Fetch items on mount
    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Move to stage handler
    const moveToStageAction = useCallback(
        async (id: string, newStatus: StageId) => {
            try {
                await moveToStage(id, newStatus);
                toast({ title: `Movido para ${STAGE_LABELS[newStatus]}` });
                await fetchItems(true);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_GENERIC,
                    description: error.message,
                    variant: "destructive",
                });
            }
        },
        [toast, fetchItems]
    );

    // Reject handler
    const rejectItem = useCallback(
        async (id: string) => {
            try {
                await rejectAlert(id);
                toast({ title: TOAST_MESSAGES.ITEM_REJECTED });
                await fetchItems(true);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_GENERIC,
                    description: error.message,
                    variant: "destructive",
                });
            }
        },
        [toast, fetchItems]
    );

    // Delete handler
    const deleteItem = useCallback(
        async (id: string) => {
            try {
                await removeAlert(id);
                toast({ title: TOAST_MESSAGES.ITEM_DELETED });
                await fetchItems(true);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_GENERIC,
                    description: error.message,
                    variant: "destructive",
                });
            }
        },
        [toast, fetchItems]
    );

    // Extract content handler
    const extractContent = useCallback(
        async (id: string, url: string) => {
            setProcessingId(id);
            try {
                await advanceAlert(id, "pending", url);
                toast({
                    title: TOAST_MESSAGES.CONTENT_EXTRACTED,
                });
                await fetchItems(true);
            } catch (error: any) {
                if (error instanceof ExtractionError) {
                    toast({
                        title: "Extração com Problemas",
                        description: "Item movido para revisão manual",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: TOAST_MESSAGES.ERROR_EXTRACTION,
                        description: error.message,
                        variant: "destructive",
                    });
                }
                await fetchItems(true);
            } finally {
                setProcessingId(null);
            }
        },
        [toast, fetchItems]
    );

    // Classify content handler
    const classifyContent = useCallback(
        async (id: string) => {
            setProcessingId(id);
            try {
                await advanceAlert(id, "extracted");
                toast({
                    title: "Classificado!",
                });
                await fetchItems(true);
            } catch (error: any) {
                if (error instanceof ClassificationError) {
                    toast({
                        title: "Classificação Falhou",
                        description: "Item movido para revisão manual",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: TOAST_MESSAGES.ERROR_CLASSIFICATION,
                        description: error.message,
                        variant: "destructive",
                    });
                }
                await fetchItems(true);
            } finally {
                setProcessingId(null);
            }
        },
        [toast, fetchItems]
    );

    // Generate LinkedIn post handler
    const generateLinkedInPost = useCallback(
        async (id: string) => {
            setProcessingId(id);
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) throw new Error(TOAST_MESSAGES.ERROR_USER_NOT_AUTH);

                await advanceAlert(id, "approved", undefined, user.id);
                toast({
                    title: TOAST_MESSAGES.POST_GENERATED,
                    description: TOAST_MESSAGES.POST_GENERATED_DESC,
                });
                await fetchItems(true);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_GENERATE_POST,
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setProcessingId(null);
            }
        },
        [toast, fetchItems]
    );

    // Retry handler
    const retryItem = useCallback(
        async (id: string, url?: string) => {
            setProcessingId(id);
            try {
                // Find current stage
                const item = Object.values(items)
                    .flat()
                    .find((i) => i.id === id);
                if (!item) throw new Error("Item not found");

                await retryAlert(id, item.status as StageId, url);
                toast({
                    title: "Tentando novamente...",
                });
                await fetchItems(true);
            } catch (error: any) {
                toast({
                    title: "Erro ao tentar novamente",
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setProcessingId(null);
            }
        },
        [toast, fetchItems, items]
    );

    // Helper functions
    const getNextStageHelper = useCallback((currentStage: StageId): StageId | null => {
        return getNextStage(currentStage);
    }, []);

    const getPrevStageHelper = useCallback((currentStage: StageId): StageId | null => {
        return getPrevStage(currentStage);
    }, []);

    const getActionLabel = useCallback((stageId: StageId): string => {
        return ACTION_LABELS[stageId];
    }, []);

    // Memoized total items count
    const totalItems = useMemo(() => {
        return Object.values(items).reduce((acc, arr) => acc + arr.length, 0);
    }, [items]);

    return {
        // State
        items,
        isLoading,
        isRefreshing,
        processingId,
        stages: PIPELINE_STAGES,
        totalItems,

        // Actions
        fetchItems,
        moveToStageAction,
        rejectItem,
        deleteItem,
        extractContent,
        classifyContent,
        generateLinkedInPost,
        retryItem,

        // Helpers
        getNextStageHelper,
        getPrevStageHelper,
        getActionLabel,
    };
}
