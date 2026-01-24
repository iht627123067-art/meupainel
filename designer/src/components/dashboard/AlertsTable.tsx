import { ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  title: string;
  publisher: string | null;
  status: string;
  created_at: string;
  url: string;
  clean_url?: string | null;
  is_valid?: boolean;
  keywords: string[] | null;
  description?: string | null;
  email_subject?: string | null;
  email_date?: string | null;
  email_id?: string | null;
}

interface AlertsTableProps {
  alerts: Alert[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLoading?: boolean;
  onRowClick?: (alert: Alert) => void;
}

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, className: "status-pending" },
  extracted: { label: "Extraído", icon: Clock, className: "bg-info/20 text-info" },
  classified: { label: "Classificado", icon: Clock, className: "bg-accent/20 text-accent" },
  approved: { label: "Aprovado", icon: CheckCircle, className: "status-approved" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "status-rejected" },
  published: { label: "Publicado", icon: CheckCircle, className: "bg-primary/20 text-primary" },
};

export function AlertsTable({ alerts, onApprove, onReject, isLoading, onRowClick }: AlertsTableProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">Nenhum alerta encontrado</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-[40%] min-w-[300px] text-muted-foreground">Título & Descrição</TableHead>
            <TableHead className="text-muted-foreground">Fonte</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Keywords</TableHead>
            <TableHead className="text-muted-foreground">Data</TableHead>
            <TableHead className="text-muted-foreground text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert, index) => {
            const status = statusConfig[alert.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <TableRow
                key={alert.id}
                className="border-border/30 hover:bg-muted/30 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onRowClick?.(alert)}
              >
                <TableCell className="max-w-[400px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base leading-tight">{alert.title}</span>
                      <a
                        href={alert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    {alert.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-snug" title={alert.description}>
                        {alert.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {alert.publisher || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn("status-badge", status.className)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap max-w-[150px]">
                    {alert.keywords?.slice(0, 2).map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {(alert.keywords?.length || 0) > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{(alert.keywords?.length || 0) - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(alert.email_date || alert.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  {alert.status === "pending" && (
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onApprove?.(alert.id)}
                        className="h-8 text-success hover:text-success hover:bg-success/10"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReject?.(alert.id)}
                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
