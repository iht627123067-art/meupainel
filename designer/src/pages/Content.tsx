import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    FileText,
    ExternalLink,
    CheckCircle,
    XCircle,
    RefreshCw,
    Loader2,
    Eye,
    TrendingUp,
    Calendar,
    Hash,
    Save,
    Pencil,
    X,
    FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";

interface ExtractedContent {
    id: string;
    alert_id: string;
    markdown_content: string;
    cleaned_content: string;
    word_count: number;
    quality_score: number;
    extraction_status: string;
    extracted_at: string;
    alerts: {
        id: string;
        title: string;
        description: string;
        publisher: string;
        url: string;
        clean_url: string;
        status: string;
        created_at: string;
        keywords: string[];
    };
}

export default function Content() {
    const [contents, setContents] = useState<ExtractedContent[]>([]);
    const [selectedContent, setSelectedContent] = useState<ExtractedContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchContents = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("extracted_content")
                .select(`
          *,
          alerts (
            id,
            title,
            description,
            publisher,
            url,
            clean_url,
            status,
            created_at,
            keywords
          )
        `)
                .order("extracted_at", { ascending: false });

            if (error) throw error;

            setContents(data as ExtractedContent[]);

            // Auto-select first item if none selected
            if (!selectedContent && data && data.length > 0) {
                setSelectedContent(data[0] as ExtractedContent);
            }
        } catch (error: any) {
            toast({
                title: "Erro ao carregar conteúdos",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContents();
    }, []);

    const handleApprove = async (contentId: string, alertId: string) => {
        try {
            setProcessingId(contentId);

            const { error } = await supabase
                .from("alerts")
                .update({ status: "classified" })
                .eq("id", alertId);

            if (error) throw error;

            toast({
                title: "Conteúdo aprovado",
                description: "O item foi movido para a etapa de classificação",
            });

            fetchContents();
        } catch (error: any) {
            toast({
                title: "Erro ao aprovar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (contentId: string, alertId: string) => {
        try {
            setProcessingId(contentId);

            const { error } = await supabase
                .from("alerts")
                .update({ status: "rejected" })
                .eq("id", alertId);

            if (error) throw error;

            toast({
                title: "Conteúdo rejeitado",
                description: "O item foi marcado como rejeitado",
            });

            fetchContents();
        } catch (error: any) {
            toast({
                title: "Erro ao rejeitar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleSendToReview = async (contentId: string, alertId: string) => {
        try {
            setProcessingId(contentId);

            const { error } = await supabase
                .from("alerts")
                .update({ status: "needs_review" })
                .eq("id", alertId);

            if (error) throw error;

            toast({
                title: "Enviado para revisão manual",
                description: "O item foi movido para a aba de revisão onde você pode editar título, publisher e data",
            });

            fetchContents();
        } catch (error: any) {
            toast({
                title: "Erro ao enviar para revisão",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReExtract = async (contentId: string, alertId: string, url: string) => {
        try {
            setProcessingId(contentId);

            // Call extract-content edge function
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await supabase.functions.invoke("extract-content", {
                body: { alert_id: alertId, url },
            });

            if (error) throw error;

            toast({
                title: "Conteúdo re-extraído",
                description: "O conteúdo foi extraído novamente com sucesso",
            });

            fetchContents();
        } catch (error: any) {
            toast({
                title: "Erro ao re-extrair",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveManualEdit = async () => {
        if (!selectedContent) return;

        try {
            setProcessingId(selectedContent.id);
            const wordCount = editContent.split(/\s+/).filter(w => w.length > 0).length;

            const { error } = await supabase
                .from("extracted_content")
                .update({
                    cleaned_content: editContent,
                    markdown_content: editContent,
                    word_count: wordCount,
                    quality_score: 1.0,
                    extraction_status: 'success'
                })
                .eq("id", selectedContent.id);

            if (error) throw error;

            toast({
                title: "Conteúdo atualizado",
                description: "O conteúdo foi salvo manualmente com sucesso",
            });

            setIsEditing(false);
            fetchContents();
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const startEditing = () => {
        if (!selectedContent) return;
        setEditContent(selectedContent.cleaned_content || selectedContent.markdown_content || "");
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditContent("");
    };

    const getQualityBadge = (score: number) => {
        if (score >= 0.8) return { label: "Excelente", variant: "default" as const, color: "text-green-600" };
        if (score >= 0.6) return { label: "Bom", variant: "secondary" as const, color: "text-blue-600" };
        if (score >= 0.4) return { label: "Regular", variant: "outline" as const, color: "text-yellow-600" };
        return { label: "Baixo", variant: "destructive" as const, color: "text-red-600" };
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-2rem)] space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Conteúdo Extraído</h1>
                        <p className="text-muted-foreground mt-1">
                            Revise e aprove os artigos extraídos
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1.5">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            {contents.length} artigos
                        </Badge>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchContents}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Main Content - Split View */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden h-full">
                    {/* Left Panel - List */}
                    <Card className="lg:col-span-1 flex flex-col h-full overflow-hidden">
                        <CardHeader className="shrink-0 p-4">
                            <CardTitle className="text-lg">Artigos</CardTitle>
                        </CardHeader>
                        <Separator />
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-2">
                                {contents.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Nenhum conteúdo extraído</p>
                                    </div>
                                ) : (
                                    contents.map((content) => {
                                        const quality = getQualityBadge(content.quality_score);
                                        const isSelected = selectedContent?.id === content.id;

                                        return (
                                            <button
                                                key={content.id}
                                                onClick={() => setSelectedContent(content)}
                                                className={cn(
                                                    "w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border bg-background hover:bg-muted/50"
                                                )}
                                            >
                                                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                                    {content.alerts.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                    <span>{content.alerts.publisher}</span>
                                                    <span>•</span>
                                                    <span>{content.word_count} palavras</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={quality.variant} className="text-[10px] h-5">
                                                        {quality.label}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] h-5">
                                                        {content.alerts.status}
                                                    </Badge>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </Card>

                    {/* Right Panel - Content Viewer */}
                    <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                        {selectedContent ? (
                            <>
                                <CardHeader className="shrink-0 p-6 pb-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <CardTitle className="text-xl mb-2 leading-relaxed">
                                                {selectedContent.alerts.title}
                                            </CardTitle>
                                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(selectedContent.extracted_at).toLocaleDateString("pt-BR")}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <FileText className="h-4 w-4" />
                                                    {selectedContent.word_count} palavras
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <TrendingUp className="h-4 w-4" />
                                                    Qualidade: {(selectedContent.quality_score * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href={selectedContent.alerts.clean_url || selectedContent.alerts.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0"
                                        >
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Original
                                            </Button>
                                        </a>
                                    </div>

                                    {/* Keywords */}
                                    {selectedContent.alerts.keywords && selectedContent.alerts.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {selectedContent.alerts.keywords.slice(0, 8).map((keyword, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-xs">
                                                    <Hash className="h-3 w-3 mr-1" />
                                                    {keyword}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-4">
                                        <Button
                                            onClick={() => handleApprove(selectedContent.id, selectedContent.alert_id)}
                                            disabled={processingId === selectedContent.id}
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {processingId === selectedContent.id ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                            )}
                                            Aprovar
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(selectedContent.id, selectedContent.alert_id)}
                                            disabled={processingId === selectedContent.id}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Rejeitar
                                        </Button>
                                        <Button
                                            onClick={isEditing ? handleSaveManualEdit : startEditing}
                                            disabled={processingId === selectedContent.id}
                                            variant={isEditing ? "default" : "outline"}
                                            size="sm"
                                            className={cn(isEditing && "bg-blue-600 hover:bg-blue-700 text-white")}
                                        >
                                            {processingId === selectedContent.id ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : isEditing ? (
                                                <Save className="h-4 w-4 mr-2" />
                                            ) : (
                                                <Pencil className="h-4 w-4 mr-2" />
                                            )}
                                            {isEditing ? "Salvar" : "Editar"}
                                        </Button>

                                        {isEditing && (
                                            <Button
                                                onClick={cancelEditing}
                                                disabled={processingId === selectedContent.id}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Cancelar
                                            </Button>
                                        )}

                                        {!isEditing && (
                                            <Button
                                                onClick={() =>
                                                    handleReExtract(
                                                        selectedContent.id,
                                                        selectedContent.alert_id,
                                                        selectedContent.alerts.clean_url || selectedContent.alerts.url
                                                    )
                                                }
                                                disabled={processingId === selectedContent.id}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Re-extrair
                                            </Button>
                                        )}

                                        {!isEditing && (
                                            <Button
                                                onClick={() => handleSendToReview(selectedContent.id, selectedContent.alert_id)}
                                                disabled={processingId === selectedContent.id}
                                                variant="outline"
                                                size="sm"
                                                className="border-amber-300 hover:bg-amber-50"
                                            >
                                                <FileEdit className="h-4 w-4 mr-2" />
                                                Revisão Manual
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <Separator />
                                <ScrollArea className="flex-1 w-full h-full">
                                    <CardContent className="p-6 lg:p-8">
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                                    Editor Manual:
                                                </label>
                                                <Textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="min-h-[500px] font-mono text-sm leading-relaxed"
                                                    placeholder="Cole ou edite o texto do artigo aqui..."
                                                />
                                            </div>
                                        ) : (
                                            <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-img:rounded-lg prose-img:shadow-md prose-headings:text-primary prose-a:text-blue-500">
                                                <ReactMarkdown
                                                    components={{
                                                        img: ({ node, ...props }) => (
                                                            <img
                                                                {...props}
                                                                className="rounded-lg shadow-md max-w-full h-auto mx-auto object-cover max-h-[500px]"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                }}
                                                            />
                                                        ),
                                                    }}
                                                >
                                                    {selectedContent.cleaned_content || selectedContent.markdown_content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </CardContent>
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Selecione um artigo para visualizar</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
