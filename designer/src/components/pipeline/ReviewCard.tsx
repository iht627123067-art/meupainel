import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    ExternalLink,
    RefreshCw,
    XCircle,
    Save,
    Loader2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    FileText,
    Link2
} from "lucide-react";
import { PipelineItem } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { cn, cleanUrl, getDisplayUrl } from "@/lib/utils";

interface ReviewCardProps {
    item: PipelineItem;
    processingId: string | null;
    onRetry: (id: string, url: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onSaveContent: (id: string, content: string) => Promise<void>;
    onClassify?: (id: string, category: string) => Promise<void>;
}

// Category definitions based on promptpalantir.md themes
export const CATEGORIES = [
    { id: "surveillance", label: "Vigilância", color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
    { id: "government", label: "Governo", color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
    { id: "military", label: "Militar", color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
    { id: "rights", label: "Direitos", color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
    { id: "stock", label: "Financeiro", color: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" },
    { id: "irrelevant", label: "Irrelevante", color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100" },
] as const;

export function ReviewCard({
    item,
    processingId,
    onRetry,
    onReject,
    onSaveContent,
    onClassify
}: ReviewCardProps) {
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [editUrl, setEditUrl] = useState(item.url);
    const [editTitle, setEditTitle] = useState(item.title);
    const [editDate, setEditDate] = useState<string | null>(item.email_date || item.created_at);
    const [isExpanded, setIsExpanded] = useState(false);
    const [manualContent, setManualContent] = useState("");
    const [extractionData, setExtractionData] = useState<{
        error_message: string | null;
        cleaned_content: string | null;
        extraction_status: string | null;
    } | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const isProcessing = processingId === item.id;

    // Fetch extraction status and content when expanded
    useEffect(() => {
        if (isExpanded && !extractionData) {
            fetchExtractionData();
        }
    }, [isExpanded]);

    const fetchExtractionData = async () => {
        setIsLoadingData(true);
        try {
            const { data, error } = await supabase
                .from("extracted_content")
                .select("*")
                .eq("alert_id", item.id)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                const typedData = data as any;
                setExtractionData({
                    error_message: typedData.error_message || null,
                    cleaned_content: typedData.cleaned_content || null,
                    extraction_status: typedData.extraction_status || null
                });
                setManualContent(typedData.cleaned_content || "");
            }
        } catch (error) {
            console.error("Error fetching extraction data:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSaveMetadata = async () => {
        try {
            let finalUrl = editUrl;
            // Auto-fix relative Forbes URLs seen in user feedback
            if (editUrl.startsWith('/') && item.publisher?.toLowerCase().includes('forbes')) {
                finalUrl = `https://www.forbes.com${editUrl}`;
            } else if (editUrl.startsWith('/') && !editUrl.includes('://')) {
                // If it's a relative path and we don't know the domain, this will likely fail
                // but at least we don't crash the UI.
                console.warn("Relative URL detected without clear domain context");
            }

            // Clean the URL to remove aggregators and tracking params
            const cleanedUrl = cleanUrl(finalUrl);
            const updatePayload: any = {
                url: finalUrl,
                clean_url: cleanedUrl,
                title: editTitle
            };

            if (editDate) {
                const parsedDate = new Date(editDate);
                if (!isNaN(parsedDate.getTime())) {
                    updatePayload.email_date = parsedDate.toISOString();
                }
            }

            const { error } = await supabase
                .from("alerts")
                .update(updatePayload)
                .eq("id", item.id);

            if (error) throw error;

            setIsEditingMetadata(false);
            await onRetry(item.id, cleanedUrl);
        } catch (error) {
            console.error("Error updating metadata:", error);
            // Optionally add a toast here if available in props
        }
    };

    // Calculate cleaned URL preview
    const cleanedUrlPreview = cleanUrl(editUrl);
    const isUrlModified = cleanedUrlPreview !== editUrl;

    // SAFE DATE CALCULATION to prevent white screen crashes
    const safeDisplayDate = (() => {
        try {
            const rawDate = item.email_date || item.created_at;
            if (!rawDate) return "Data N/A";
            const d = new Date(rawDate);
            return isNaN(d.getTime()) ? "Data Inválida" : d.toLocaleDateString();
        } catch {
            return "Erro na data";
        }
    })();

    return (
        <Card className="border-l-4 border-l-orange-500 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 pr-4">
                        <CardTitle className="text-lg leading-tight">{item.title || "Sem Título"}</CardTitle>
                        <CardDescription>
                            {item.publisher || "Fonte desconhecida"} • {safeDisplayDate}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50 shrink-0">
                        Necessita de Revisão
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-3">
                {/* Score & Classification Section */}
                <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-border/30">
                    {/* Score Indicator */}
                    {item.personalization_score != null && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Pontuação:</span>
                            <div className="flex items-center gap-1">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            item.personalization_score >= 7 ? "bg-green-500" :
                                                item.personalization_score >= 4 ? "bg-yellow-500" : "bg-gray-400"
                                        )}
                                        style={{ width: `${Math.min(100, (item.personalization_score / 15) * 100)}%` }}
                                    />
                                </div>
                                <span className={cn(
                                    "text-xs font-bold",
                                    item.personalization_score >= 7 ? "text-green-600" :
                                        item.personalization_score >= 4 ? "text-yellow-600" : "text-muted-foreground"
                                )}>
                                    {item.personalization_score}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Keywords Display */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Temas:</span>
                        <div className="flex flex-wrap gap-1.5">
                            {item.keywords && item.keywords.length > 0 ? (
                                item.keywords.slice(0, 3).map((kw, idx) => (
                                    <Badge key={idx} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal bg-muted/50">
                                        {kw}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-[10px] text-muted-foreground italic">Nenhum</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Quick-Classify Chips */}
                {onClassify && (
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
                            Classificar como:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => onClassify(item.id, cat.id)}
                                    disabled={isProcessing}
                                    className={cn(
                                        "px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                                        cat.color,
                                        item.classification === cat.id && "ring-2 ring-offset-1 ring-primary",
                                        isProcessing && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Metadata Section (URL + Date) */}
                <div className="space-y-3 bg-muted/30 p-3 rounded-md border border-border/50">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Link2 className="h-3 w-3" /> Metadados da Notícia
                        </label>
                        {!isEditingMetadata && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs hover:bg-background"
                                onClick={() => setIsEditingMetadata(true)}
                            >
                                Editar Dados
                            </Button>
                        )}
                    </div>

                    {isEditingMetadata ? (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            <div className="grid gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Título</label>
                                    <Input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="h-8 text-sm font-medium"
                                        placeholder="Título da notícia..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-muted-foreground font-medium">URL Original</label>
                                    <Input
                                        value={editUrl}
                                        onChange={(e) => setEditUrl(e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="https://..."
                                    />
                                    {isUrlModified && (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-semibold text-blue-900 uppercase tracking-wider mb-1">URL será limpa automaticamente:</p>
                                                    <p className="text-xs text-blue-700 break-all font-mono">{cleanedUrlPreview}</p>
                                                    <p className="text-[9px] text-blue-600 mt-1 italic">Parâmetros de rastreamento e redirecionamentos removidos</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Data da Notícia</label>
                                    <Input
                                        type="date"
                                        value={(() => {
                                            if (!editDate) return '';
                                            try {
                                                const d = new Date(editDate);
                                                return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
                                            } catch {
                                                return '';
                                            }
                                        })()}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="h-8 text-sm w-full sm:w-48"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditingMetadata(false);
                                        setEditUrl(item.url);
                                        setEditDate(item.email_date || item.created_at);
                                    }}
                                    className="h-8"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveMetadata}
                                    disabled={isProcessing}
                                    className="h-8 shadow-sm"
                                >
                                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                                    Salvar e Re-extrair
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground break-all">
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <a
                                    href={getDisplayUrl(item)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-primary hover:underline line-clamp-1"
                                >
                                    {getDisplayUrl(item)}
                                </a>
                            </div>
                            {item.clean_url && item.clean_url !== item.url && (
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 italic">
                                    <span>URL Original (auditoria): {item.url}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <span className="uppercase tracking-wider">Data:</span>
                                <span>{safeDisplayDate}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Message Section */}
                {extractionData?.error_message && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-md flex gap-3 text-red-700">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold uppercase">Erro na última tentativa:</p>
                            <p className="text-sm">{extractionData.error_message}</p>
                        </div>
                    </div>
                )}

                {/* Manual Content Section Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-muted-foreground font-medium border border-dashed hover:border-solid"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className="flex items-center gap-2 text-xs uppercase tracking-wider">
                        <FileText className="h-4 w-4" />
                        Ajuste Manual do Texto
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>

                {isExpanded && (
                    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conteúdo Extraído:</label>
                                {isLoadingData && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                            </div>
                            <Textarea
                                value={manualContent}
                                onChange={(e) => setManualContent(e.target.value)}
                                placeholder="Insira ou edite o texto do artigo manualmente aqui..."
                                className="min-h-[200px] font-mono text-sm resize-y"
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                Ao salvar manualmente, o item será movido para o estágio de classificação ("Extraído").
                            </p>
                        </div>
                        <Button
                            className="w-full"
                            size="sm"
                            disabled={isProcessing || !manualContent.trim()}
                            onClick={() => onSaveContent(item.id, manualContent)}
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Texto e Avançar
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/20 py-3 px-4 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(item.id)}
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-8"
                >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar Item
                </Button>
                <div className="flex-1" />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(item.id, getDisplayUrl(item))}
                    disabled={isProcessing}
                    className="h-8 shadow-sm"
                >
                    {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4 text-primary" />
                    )}
                    Tentar Novamente
                </Button>
            </CardFooter>
        </Card>
    );
}
