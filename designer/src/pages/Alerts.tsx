import { useState, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AlertsTable } from "@/components/dashboard/AlertsTable";
import { ImportEmailsModal, AlertDetailPanel, ClusterAlertsCard } from "@/components/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "@/hooks/useAlerts";
import { STATUS_FILTERS } from "@/constants";
import { Search, Filter, RefreshCw, Upload, Mail, Tag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Alert, AlertStatus } from "@/types";
import { BulkActionsBar } from "@/components/shared/BulkActionsBar";
import { GenerationProgressModal } from "@/components/shared/GenerationProgressModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Topic options for filtering
const TOPIC_OPTIONS = [
  { value: 'all', label: 'Todos os Tópicos' },
  { value: 'ai', label: '🤖 Inteligência Artificial' },
  { value: 'palantir', label: '📊 Palantir' },
  { value: 'elections', label: '🗳️ Eleições' },
  { value: 'trump', label: '🇺🇸 Trump' },
  { value: 'musk', label: '🚀 Elon Musk' },
  { value: 'crypto', label: '💰 Crypto' },
  { value: 'tech', label: '💻 Tecnologia' },
];

export default function Alerts() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState<'preparing' | 'generating' | 'saving' | 'complete' | 'error'>('preparing');
  const [generationError, setGenerationError] = useState<string>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use custom hook with all business logic
  const {
    alerts,
    isLoading,
    searchTerm,
    topicFilter,
    statusFilter,
    selectedAlert,
    isExtracting,
    filteredAlerts,
    statusCounts,
    setSearchTerm,
    setTopicFilter,
    setSelectedAlert,
    toggleStatusFilter,
    fetchAlerts,
    loadMore,
    hasMore,
    totalCount,
    handleApprove,
    handleReject,
    handleExtract,
  } = useAlerts();

  // Memoized UI handlers
  const handleImportModalClose = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  const handleImportModalOpen = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAlerts(true);
  }, [fetchAlerts]);

  // Debounce search - trigger fetch after user stops typing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);

      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout to fetch after 500ms of no typing
      searchTimeoutRef.current = setTimeout(() => {
        fetchAlerts(true);
      }, 500);
    },
    [setSearchTerm, fetchAlerts]
  );

  const handleRowClick = useCallback(
    (alert: Alert) => {
      setSelectedAlert(alert);
    },
    [setSelectedAlert]
  );

  const handleDetailPanelClose = useCallback(() => {
    setSelectedAlert(null);
  }, [setSelectedAlert]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAlerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAlerts.map(a => a.id)));
    }
  }, [selectedIds.size, filteredAlerts]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSendToPodcast = useCallback(async (mode: 'deep' | 'quick' | 'chatgpt-full' | 'chatgpt-quick') => {
    if (!user || selectedIds.size === 0) return;

    setIsGenerating(true);
    setProgressStage('preparing');

    try {
      setProgressStage('generating');
      const { data, error } = await supabase.functions.invoke('generate-personalized-podcast', {
        body: {
          user_id: user.id,
          mode,
          specific_alert_ids: Array.from(selectedIds)
        }
      });

      if (error) throw error;

      setProgressStage('saving');
      await new Promise(resolve => setTimeout(resolve, 500));

      setProgressStage('complete');
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error generating podcast:', error);
      setProgressStage('error');
      setGenerationError(error instanceof Error ? error.message : 'Erro ao gerar podcast');
    }
  }, [user, selectedIds]);

  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'approved' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: `${selectedIds.size} itens aprovados!`,
        description: "Os alertas foram movidos para o pipeline"
      });

      setSelectedIds(new Set());
      fetchAlerts();
    } catch (error) {
      toast({
        title: "Erro ao aprovar itens",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  }, [selectedIds, fetchAlerts, toast]);

  const handleSendToReview = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'needs_review' })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: `${selectedIds.size} enviados para revisão`,
        description: "Os alertas estão disponíveis na aba de Revisão Manual"
      });

      setSelectedIds(new Set());
      fetchAlerts();
      navigate("/review");
    } catch (error) {
      toast({
        title: "Erro ao enviar para revisão",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  }, [selectedIds, fetchAlerts, toast, navigate]);

  const handleSendToResearch = useCallback(() => {
    if (selectedIds.size === 0) return;
    const idsParam = Array.from(selectedIds).join(',');
    navigate(`/research?context_ids=${idsParam}`);
  }, [selectedIds, navigate]);

  // Create displayList with clustering logic (similar to Review.tsx)
  const displayList = useMemo(() => {
    const list = filteredAlerts.reduce((acc, item) => {
      if (item.duplicate_group_id) {
        // Find existing cluster with same duplicate_group_id
        const existingGroup = acc.find(
          (x) =>
            x.type === 'cluster' &&
            x.items &&
            x.items.length > 0 &&
            x.items[0].duplicate_group_id === item.duplicate_group_id
        ) as { type: 'cluster'; items: Alert[] } | undefined;

        if (existingGroup) {
          existingGroup.items.push(item);
        } else {
          acc.push({ type: 'cluster', items: [item] });
        }
      } else {
        acc.push({ type: 'single', item });
      }
      return acc;
    }, [] as Array<{ type: 'single'; item: Alert } | { type: 'cluster'; items: Alert[] }>);

    // Sort by highest score in group/item
    list.sort((a, b) => {
      const scoreA =
        a.type === 'single'
          ? a.item.personalization_score || 0
          : Math.max(...a.items.map((i) => i.personalization_score || 0));
      const scoreB =
        b.type === 'single'
          ? b.item.personalization_score || 0
          : Math.max(...b.items.map((i) => i.personalization_score || 0));
      return scoreB - scoreA;
    });

    return list;
  }, [filteredAlerts]);

  // Cluster action handlers
  const handleApproveCluster = useCallback(
    async (selectedId: string, allIds: string[]) => {
      try {
        // Approve the selected item
        await handleApprove(selectedId);
        // Reject the others
        const rejectIds = allIds.filter((id) => id !== selectedId);
        for (const id of rejectIds) {
          await handleReject(id);
        }
        toast({
          title: "Cluster aprovado!",
          description: `Item selecionado aprovado, ${rejectIds.length} duplicatas rejeitadas.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao aprovar cluster",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
    },
    [handleApprove, handleReject, toast]
  );

  const handleRejectCluster = useCallback(
    async (allIds: string[]) => {
      try {
        for (const id of allIds) {
          await handleReject(id);
        }
        toast({
          title: "Cluster rejeitado!",
          description: `${allIds.length} itens rejeitados.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao rejeitar cluster",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
    },
    [handleReject, toast]
  );

  return (
    <DashboardLayout>
      <BulkActionsBar
        selectedCount={selectedIds.size}
        maxSelection={25}
        onClear={handleClearSelection}
        onSendToPodcast={handleSendToPodcast}
        onBatchApprove={handleBatchApprove}
        onSendToReview={handleSendToReview}
        onSendToResearch={handleSendToResearch}
        isProcessing={isGenerating}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alertas Gmail</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os alertas do Google extraídos do Gmail
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImportModalOpen} variant="default">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Mail className="h-3 w-3 mr-1" />
            Total: {totalCount}
          </Badge>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge
              key={status}
              variant={statusFilter.includes(status as AlertStatus) ? "default" : "secondary"}
              className="px-3 py-1 cursor-pointer"
              onClick={() => toggleStatusFilter(status as AlertStatus)}
            >
              {status}: {count}
            </Badge>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar alertas por título, publicador ou descrição..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          <Select value={topicFilter} onValueChange={(value) => {
            setTopicFilter(value);
            fetchAlerts(true);
          }}>
            <SelectTrigger className="w-56">
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por tópico" />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {STATUS_FILTERS.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={() => toggleStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Alerts Display - Clusters and Single Items */}
        {isLoading ? (
          <div className="glass-card p-8">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </div>
        ) : displayList.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Nenhum alerta encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Render clusters first */}
            {displayList
              .filter((entry) => entry.type === 'cluster')
              .map((entry, idx) => {
                const groupItems = (entry as { type: 'cluster'; items: Alert[] }).items;
                return (
                  <div
                    key={`cluster-${groupItems[0].duplicate_group_id}`}
                    className="relative animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <ClusterAlertsCard
                      items={groupItems}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onApproveCluster={handleApproveCluster}
                      onRejectCluster={handleRejectCluster}
                    />
                  </div>
                );
              })}

            {/* Render single items in one table */}
            {(() => {
              const singleItems = displayList
                .filter((entry) => entry.type === 'single')
                .map((entry) => (entry as { type: 'single'; item: Alert }).item);

              if (singleItems.length > 0) {
                return (
                  <AlertsTable
                    alerts={singleItems}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRowClick={handleRowClick}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                  />
                );
              }
              return null;
            })()}
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="flex justify-center pt-4 pb-8">
            <Button variant="outline" onClick={loadMore} className="w-full max-w-sm">
              Carregar mais
            </Button>
          </div>
        )}

        {/* Import Modal */}
        <ImportEmailsModal
          isOpen={isImportModalOpen}
          onClose={handleImportModalClose}
          onSuccess={handleRefresh}
        />

        {/* Detail Panel */}
        <AlertDetailPanel
          alert={selectedAlert}
          isOpen={!!selectedAlert}
          onClose={handleDetailPanelClose}
          onApprove={handleApprove}
          onReject={handleReject}
          onExtract={handleExtract}
          isExtracting={isExtracting}
        />

        {/* Generation Progress Modal */}
        <GenerationProgressModal
          isOpen={isGenerating}
          onClose={() => setIsGenerating(false)}
          stage={progressStage}
          error={generationError}
        />
      </div>
    </DashboardLayout>
  );
}
