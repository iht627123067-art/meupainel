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
import { cn } from "@/lib/utils";

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
            const updatePayload: any = { url: editUrl, clean_url: editUrl };
            if (editDate) {
                updatePayload.email_date = new Date(editDate).toISOString();
            }

            const { error } = await supabase
                .from("alerts")
                .update(updatePayload)
                .eq("id", item.id);

            if (error) throw error;

            setIsEditingMetadata(false);
            await onRetry(item.id, editUrl);
        } catch (error) {
            console.error("Error updating metadata:", error);
        }
    };

    return (
        <Card className="border-l-4 border-l-orange-500 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 pr-4">
                        <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                        <CardDescription>
                            {item.publisher} • {new Date(item.email_date || item.created_at).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50 shrink-0">
                        Needs Review
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-3">
                {/* Score & Classification Section */}
                <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-border/30">
                    {/* Score Indicator */}
                    {item.personalization_score != null && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Score:</span>
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
                                        item.personalization_score >= 4 ? "text-yellow-600" : "text-gray-500"
                                )}>
                                    {item.personalization_score}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Keywords Display */}
                    {item.keywords && item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold mr-1">Temas:</span>
                            {item.keywords.map((kw, idx) => (
                                <Badge key={idx} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal bg-muted/50">
                                    {kw}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Current Classification Badge */}
                    {item.classification && (
                        <Badge className="text-[10px]">
                            {CATEGORIES.find(c => c.id === item.classification)?.label || item.classification}
                        </Badge>
                    )}
                </div>

                {/* Category Quick-Classify Chips */}
                {onClassify && (
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase text-muted-foreground font-semibold">
                            Classificar como:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
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
                                    <label className="text-[10px] uppercase text-muted-foreground font-medium">URL do Artigo</label>
                                    <Input
                                        value={editUrl}
                                        onChange={(e) => setEditUrl(e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase text-muted-foreground font-medium">Data da Notícia</label>
                                    <Input
                                        type="date"
                                        value={editDate ? new Date(editDate).toISOString().split('T')[0] : ''}
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
                                    className="h-8"
                                >
                                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                                    Salvar & Re-extrair
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground break-all">
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-primary hover:underline line-clamp-1"
                                >
                                    {item.url}
                                </a>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <span className="uppercase tracking-wider">Data:</span>
                                <span>{new Date(item.email_date || item.created_at).toLocaleDateString()}</span>
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
                    onClick={() => onRetry(item.id, item.url)}
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
