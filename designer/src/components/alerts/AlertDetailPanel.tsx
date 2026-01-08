import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    ExternalLink,
    CheckCircle,
    XCircle,
    Calendar,
    Mail,
    Globe,
    Link2,
    Tag,
    FileText,
    ArrowRight,
    Loader2,
} from "lucide-react";

interface AlertDetailPanelProps {
    alert: {
        id: string;
        title: string;
        description: string | null;
        publisher: string | null;
        url: string;
        clean_url: string | null;
        email_subject: string | null;
        email_date: string | null;
        email_id: string | null;
        status: string;
        is_valid: boolean;
        keywords: string[] | null;
        created_at: string;
    } | null;
    isOpen: boolean;
    onClose: () => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onExtract?: (id: string) => void;
    isExtracting?: boolean;
}

// Memoized component to prevent unnecessary re-renders
export const AlertDetailPanel = React.memo(function AlertDetailPanel({
    alert,
    isOpen,
    onClose,
    onApprove,
    onReject,
    onExtract,
    isExtracting = false,
}: AlertDetailPanelProps) {
    // Memoized status configurations
    const statusColors = useMemo(
        () => ({
            pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            extracted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            classified: "bg-purple-500/10 text-purple-500 border-purple-500/20",
            approved: "bg-green-500/10 text-green-500 border-green-500/20",
            rejected: "bg-red-500/10 text-red-500 border-red-500/20",
            published: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        }),
        []
    );

    const statusLabels = useMemo(
        () => ({
            pending: "Pendente",
            extracted: "Extraído",
            classified: "Classificado",
            approved: "Aprovado",
            rejected: "Rejeitado",
            published: "Publicado",
        }),
        []
    );

    if (!alert) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
                <SheetHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <SheetTitle className="text-left">{alert.title}</SheetTitle>
                        <Badge
                            variant="outline"
                            className={statusColors[alert.status] || ""}
                        >
                            {statusLabels[alert.status] || alert.status}
                        </Badge>
                    </div>
                    <SheetDescription className="text-left">
                        {alert.description || "Sem descrição disponível"}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-6 py-6">
                        {/* Metadata Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Informações
                            </h4>

                            <div className="space-y-3">
                                {alert.publisher && (
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-sm">{alert.publisher}</span>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <Link2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">URL Original</p>
                                        <a
                                            href={alert.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline break-all"
                                        >
                                            {alert.url}
                                        </a>
                                    </div>
                                </div>

                                {alert.clean_url && alert.clean_url !== alert.url && (
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1 min-w-0">
                                            <p className="text-xs text-muted-foreground">URL Limpa</p>
                                            <a
                                                href={alert.clean_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline break-all"
                                            >
                                                {alert.clean_url}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm">
                                        {new Date(alert.created_at).toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Email Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Origem do Email
                            </h4>

                            <div className="space-y-3">
                                {alert.email_subject && (
                                    <div className="flex items-start gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Assunto</p>
                                            <p className="text-sm">{alert.email_subject}</p>
                                        </div>
                                    </div>
                                )}

                                {alert.email_date && (
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Data do Email</p>
                                            <p className="text-sm">
                                                {new Date(alert.email_date).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {alert.email_id && (
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">ID do Email</p>
                                            <p className="text-sm font-mono text-xs">{alert.email_id}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Keywords Section */}
                        {alert.keywords && alert.keywords.length > 0 && (
                            <>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                        Palavras-chave
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {alert.keywords.map((keyword, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                                <Tag className="h-3 w-3 mr-1" />
                                                {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Validation Status */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Validação
                            </h4>
                            <div className="flex items-center gap-2">
                                {alert.is_valid ? (
                                    <>
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-green-500 font-medium">URL Válida</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-5 w-5 text-red-500" />
                                        <span className="text-sm text-red-500 font-medium">URL Inválida</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Actions Footer */}
                <div className="border-t pt-4 space-y-3">
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => window.open(alert.clean_url || alert.url, "_blank")}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir Artigo
                    </Button>

                    {alert.status === "pending" && (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="destructive"
                                onClick={() => onReject?.(alert.id)}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rejeitar
                            </Button>
                            <Button onClick={() => onApprove?.(alert.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprovar
                            </Button>
                        </div>
                    )}

                    {alert.status === "pending" && onExtract && (
                        <Button
                            className="w-full"
                            onClick={() => onExtract(alert.id)}
                            disabled={isExtracting}
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Extraindo...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    Extrair Conteúdo
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
});
