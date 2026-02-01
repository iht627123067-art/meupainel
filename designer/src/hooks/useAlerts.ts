import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { TOAST_MESSAGES } from "@/constants";
import type { Alert, AlertStatus } from "@/types";
import {
    fetchAlerts as fetchAlertsService,
    updateAlertStatus,
    fetchAlertById
} from "@/services/api/alerts.service";
import { supabase } from "@/integrations/supabase/client"; // Kept for edge function invoke

export interface UseAlertsReturn {
    // State
    alerts: Alert[];
    isLoading: boolean;
    searchTerm: string;
    statusFilter: AlertStatus[];
    selectedAlert: Alert | null;
    isExtracting: boolean;
    filteredAlerts: Alert[];
    statusCounts: Record<string, number>;
    totalCount: number;
    hasMore: boolean;

    // Actions
    setSearchTerm: (term: string) => void;
    setSelectedAlert: (alert: Alert | null) => void;
    toggleStatusFilter: (status: AlertStatus) => void;
    fetchAlerts: (refresh?: boolean) => Promise<void>;
    loadMore: () => Promise<void>;
    handleApprove: (id: string) => Promise<void>;
    handleReject: (id: string) => Promise<void>;
    handleExtract: (id: string) => Promise<void>;
}

/**
 * Custom hook for managing alerts with business logic
 * Provides memoized handlers and computed values for performance
 */
export function useAlerts(): UseAlertsReturn {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<AlertStatus[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const ITEMS_PER_PAGE = 50;

    const { toast } = useToast();

    // Memoized fetch function
    const fetchAlerts = useCallback(async (refresh = false) => {
        setIsLoading(refresh); // Only show full loading on refresh, background load for pagination
        try {
            const currentPage = refresh ? 1 : page;
            const { data, count } = await fetchAlertsService({
                sourceType: "gmail_alert",
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                // Select only necessary fields for the list view to save bandwidth
                select: "id, title, description, publisher, status, created_at, url, clean_url, is_valid, duplicate_group_id, personalization_score, email_date"
            });

            if (refresh) {
                setAlerts(data as Alert[]);
                setPage(2);
            } else {
                setAlerts(prev => [...prev, ...data as Alert[]]);
                setPage(prev => prev + 1);
            }

            setTotalCount(count || 0);
            setHasMore(data.length === ITEMS_PER_PAGE);

        } catch (error: any) {
            toast({
                title: TOAST_MESSAGES.ERROR_LOAD_ALERTS,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, page]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        await fetchAlerts(false);
    }, [hasMore, isLoading, fetchAlerts]);

    // Fetch alerts on mount
    useEffect(() => {
        fetchAlerts(true);
    }, []);

    // Memoized approve handler
    const handleApprove = useCallback(
        async (id: string) => {
            try {
                await updateAlertStatus(id, "approved");

                toast({ title: TOAST_MESSAGES.ALERT_APPROVED });
                // We don't want to re-fetch EVERYTHING on a single action as it might reset scroll
                // Optimistic update locally
                setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
                setSelectedAlert(null);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_GENERIC,
                    description: error.message,
                    variant: "destructive",
                });
                // Revert on error or fetch
                await fetchAlerts(true);
            }
        },
        [toast, fetchAlerts]
    );

    // Memoized reject handler
    const handleReject = useCallback(
        async (id: string) => {
            try {
                await updateAlertStatus(id, "rejected");

                toast({ title: TOAST_MESSAGES.ALERT_REJECTED });
                // Optimistic update
                setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
                setSelectedAlert(null);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_GENERIC,
                    description: error.message,
                    variant: "destructive",
                });
                await fetchAlerts(true);
            }
        },
        [toast, fetchAlerts]
    );

    // Memoized extract handler
    const handleExtract = useCallback(
        async (id: string) => {
            const alertToExtract = alerts.find((a) => a.id === id);

            // Validation 1: Check if alert exists
            if (!alertToExtract) return;

            // Validation 2: Check valid URL
            const targetUrl = alertToExtract.clean_url || alertToExtract.url;
            if (!targetUrl || !targetUrl.startsWith('http')) {
                toast({
                    title: "URL Inválida",
                    description: "Não é possível extrair conteúdo deste alerta.",
                    variant: "destructive",
                });
                return;
            }

            // Validation 3: Check if already extracting (handled by state, but good to be safe)
            if (isExtracting) return;

            setIsExtracting(true);
            try {
                const { data, error } = await supabase.functions.invoke("extract-content", {
                    body: {
                        alert_id: id,
                        url: targetUrl,
                    },
                });

                if (error) throw error;

                toast({
                    title: TOAST_MESSAGES.CONTENT_EXTRACTED,
                    description: `${data.word_count} palavras extraídas. Qualidade: ${Math.round(
                        data.quality_score * 100
                    )}%`,
                });

                // Optimistic update isn't enough here as we might want updated fields
                // But full refresh is heavy. Let's fetch just this item or refresh
                await fetchAlerts(true);
                setSelectedAlert(null);
            } catch (error: any) {
                toast({
                    title: TOAST_MESSAGES.ERROR_EXTRACTION,
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setIsExtracting(false);
            }
        },
        [alerts, toast, fetchAlerts, isExtracting]
    );

    // Fetch full details when selecting an alert
    const selectAlert = useCallback(async (alert: Alert | null) => {
        if (!alert) {
            setSelectedAlert(null);
            return;
        }

        // Optimistically set partial data
        setSelectedAlert(alert);

        try {
            // Fetch full details (including content, html, etc which might be missing from list)
            const fullAlert = await fetchAlertById(alert.id);
            if (fullAlert) {
                setSelectedAlert(fullAlert);
            }
        } catch (error) {
            console.error("Error fetching alert details:", error);
            // Keep showing partial data, maybe show a toast warning?
        }
    }, []);

    // Memoized toggle status filter
    const toggleStatusFilter = useCallback((status: AlertStatus) => {
        setStatusFilter((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
        );
    }, []);

    // Memoized filtered alerts
    // Client-side filtering applies to "loaded" alerts. 
    // Ideally filtering should happen on backend if dataset is large, 
    // but for now combining pagination + client filter is tricky.
    // If backend pagination is used, client filtering only filters CURRENT PAGE(s).
    // This is a common tradeoff. For full search, we should push search to backend.
    // Given the task, we'll keep client filtering on loaded items for now.
    const filteredAlerts = useMemo(() => {
        return alerts.filter((alert) => {
            const matchesSearch =
                alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.publisher?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.description?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                statusFilter.length === 0 || statusFilter.includes(alert.status);

            return matchesSearch && matchesStatus;
        });
    }, [alerts, searchTerm, statusFilter]);

    // Memoized status counts
    const statusCounts = useMemo(() => {
        return alerts.reduce((acc, alert) => {
            acc[alert.status] = (acc[alert.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [alerts]);

    return {
        // State
        alerts,
        isLoading,
        searchTerm,
        statusFilter,
        selectedAlert,
        isExtracting,
        filteredAlerts,
        statusCounts,
        totalCount,
        hasMore,

        // Actions
        setSearchTerm,
        setSelectedAlert: selectAlert,
        toggleStatusFilter,
        fetchAlerts,
        loadMore,
        handleApprove,
        handleReject,
        handleExtract,
    };
}
