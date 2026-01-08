import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AlertsTable } from "@/components/dashboard/AlertsTable";
import { ImportEmailsModal, AlertDetailPanel } from "@/components/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "@/hooks/useAlerts";
import { STATUS_FILTERS } from "@/constants";
import { Search, Filter, RefreshCw, Upload, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Alert, AlertStatus } from "@/types";

export default function Alerts() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Use custom hook with all business logic
  const {
    alerts,
    isLoading,
    searchTerm,
    statusFilter,
    selectedAlert,
    isExtracting,
    filteredAlerts,
    statusCounts,
    setSearchTerm,
    setSelectedAlert,
    toggleStatusFilter,
    fetchAlerts,
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
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [setSearchTerm]
  );

  const handleRowClick = useCallback(
    (alert: any) => {
      setSelectedAlert(alert as Alert);
    },
    [setSelectedAlert]
  );

  const handleDetailPanelClose = useCallback(() => {
    setSelectedAlert(null);
  }, [setSelectedAlert]);

  return (
    <DashboardLayout>
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
            Total: {alerts.length}
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

        {/* Alerts Table */}
        <AlertsTable
          alerts={filteredAlerts}
          onApprove={handleApprove}
          onReject={handleReject}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />

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
      </div>
    </DashboardLayout>
  );
}
