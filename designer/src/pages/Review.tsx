import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePipeline } from "@/hooks/usePipeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, PlusCircle, Save, X, FileText, Link2, Sparkles, Loader2, XCircle } from "lucide-react";
import { ReviewCard, CATEGORIES } from "@/components/pipeline/ReviewCard";
import { ClusterReviewCard } from "@/components/pipeline/ClusterReviewCard";
import { createManualEntry, createAlertAndExtract } from "@/services/api/content.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ReviewPage() {
    const {
        items,
        fetchItems,
        retryItem,
        rejectItem,
        saveManualContentAction,
        processingId,
        classifyItem,
        mergeItems
    } = usePipeline();
    const { toast } = useToast();

    const [isAddingManual, setIsAddingManual] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [urlToExtract, setUrlToExtract] = useState("");
    const [manualEntry, setManualEntry] = useState({
        title: "",
        url: "",
        publisher: "",
        content: ""
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [minScore, setMinScore] = useState<number>(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);


    const reviewItems = items.needs_review || [];

    const filteredItems = reviewItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.publisher && item.publisher.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesScore = (item.personalization_score || 0) >= minScore;
        return matchesSearch && matchesScore;
    });

    const displayList = filteredItems.reduce((acc, item) => {
        if (item.duplicate_group_id) {
            const existingGroup = acc.find(x => x.type === 'cluster' && x.items[0].duplicate_group_id === item.duplicate_group_id) as { type: 'cluster', items: any[] } | undefined;
            if (existingGroup) {
                existingGroup.items.push(item);
            } else {
                acc.push({ type: 'cluster', items: [item] });
            }
        } else {
            acc.push({ type: 'single', item });
        }
        return acc;
    }, [] as Array<{ type: 'single', item: any } | { type: 'cluster', items: any[] }>);

    // Sort by highest score in group/item
    displayList.sort((a, b) => {
        const scoreA = a.type === 'single' ? (a.item.personalization_score || 0) : Math.max(...a.items.map(i => i.personalization_score || 0));
        const scoreB = b.type === 'single' ? (b.item.personalization_score || 0) : Math.max(...b.items.map(i => i.personalization_score || 0));
        return scoreB - scoreA;
    });


    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchReject = async () => {
        if (!confirm(`Deseja rejeitar ${selectedIds.length} itens?`)) return;

        setIsSubmitting(true);
        try {
            for (const id of selectedIds) {
                await rejectItem(id);
            }
            setSelectedIds([]);
            toast({ title: `${selectedIds.length} itens rejeitados` });
        } catch (error) {
            toast({ title: "Erro na rejeição em lote", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleBatchRetry = async () => {
        setIsSubmitting(true);
        try {
            for (const id of selectedIds) {
                const item = reviewItems.find(i => i.id === id);
                if (item) await retryItem(id, item.url);
            }
            setSelectedIds([]);
            toast({ title: `${selectedIds.length} extrações iniciadas` });
        } catch (error) {
            toast({ title: "Erro no processamento em lote", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBatchClassify = async (categoryId: string) => {
        const categoryLabel = CATEGORIES.find(c => c.id === categoryId)?.label;
        if (!confirm(`Classificar ${selectedIds.length} itens como "${categoryLabel}"?`)) return;

        setIsSubmitting(true);
        try {
            for (const id of selectedIds) {
                await classifyItem(id, categoryId);
            }
            const count = selectedIds.length;
            setSelectedIds([]);
            toast({
                title: categoryId === "irrelevant" ? "Itens rejeitados" : "Itens classificados",
                description: `${count} itens movidos para "${categoryLabel}"`
            });
        } catch (error) {
            toast({ title: "Erro na classificação em lote", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };



    const handleCreateManual = async () => {
        if (!manualEntry.title || !manualEntry.url || !manualEntry.content) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha Título, URL e Conteúdo.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await createManualEntry(
                manualEntry.title,
                manualEntry.url,
                manualEntry.publisher || "Manual",
                manualEntry.content
            );

            toast({
                title: "Notícia criada com sucesso!",
                description: "O item foi adicionado ao pipeline como extraído.",
            });

            setIsAddingManual(false);
            setManualEntry({ title: "", url: "", publisher: "", content: "" });
            fetchItems();
        } catch (error) {
            toast({
                title: "Erro ao criar",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExtractByUrl = async () => {
        if (!urlToExtract) {
            toast({
                title: "URL necessária",
                description: "Por favor, insira a URL da notícia.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await createAlertAndExtract(urlToExtract);

            toast({
                title: "Extração iniciada!",
                description: "A notícia está sendo processada e aparecerá no pipeline em breve.",
            });

            setIsAddingManual(false);
            setUrlToExtract("");
            fetchItems();
        } catch (error) {
            toast({
                title: "Erro na extração",
                description: error instanceof Error ? error.message : "Erro ao extrair conteúdo da URL",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <AlertTriangle className="h-8 w-8 text-orange-500" />
                            Revisão Manual
                        </h1>
                        <Button
                            onClick={() => setIsAddingManual(!isAddingManual)}
                            variant={isAddingManual ? "secondary" : "default"}
                        >
                            {isAddingManual ? <X className="h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                            {isAddingManual ? "Cancelar" : "Adicionar Notícia"}
                        </Button>
                    </div>
                    <p className="text-muted-foreground">
                        Itens que falharam na extração automática ou inserção de novos conteúdos.
                    </p>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-end bg-muted/30 p-4 rounded-lg border border-border/50">
                    <div className="flex-1 space-y-1 w-full">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Pesquisar</label>
                        <Input
                            placeholder="Filtrar por título ou fonte..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="w-full sm:w-40 space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Score Mínimo: {minScore}</label>
                        <Input
                            type="range"
                            min="0"
                            max="15"
                            value={minScore}
                            onChange={(e) => setMinScore(parseInt(e.target.value))}
                            className="h-9"
                        />
                    </div>
                    {filteredItems.length < reviewItems.length && (
                        <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setMinScore(0); }} className="h-9">
                            Limpar
                        </Button>
                    )}
                </div>

                {/* Batch Actions Toolbar */}
                {selectedIds.length > 0 && (
                    <div className="sticky top-4 z-50 bg-background/95 backdrop-blur border border-primary/20 shadow-xl p-3 rounded-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <Badge variant="default" className="h-6">{selectedIds.length} selecionados</Badge>
                            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])} className="h-8">Desmarcar</Button>
                        </div>

                        <div className="hidden md:flex items-center gap-1.5 border-x px-4 mx-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap mr-1">Classificar como:</span>
                            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                                {CATEGORIES.map(cat => (
                                    <Button
                                        key={cat.id}
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-7 px-2 text-[10px] uppercase font-bold border border-transparent hover:border-border",
                                            cat.color
                                        )}
                                        onClick={() => handleBatchClassify(cat.id)}
                                        disabled={isSubmitting}
                                    >
                                        {cat.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBatchRetry}
                                disabled={isSubmitting}
                                className="h-8 border-primary/30"
                            >
                                <Sparkles className="h-3.5 w-3.5 mr-2" /> Extrair
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBatchReject}
                                disabled={isSubmitting}
                                className="h-8"
                            >
                                <XCircle className="h-3.5 w-3.5 mr-2" /> Rejeitar
                            </Button>
                        </div>

                    </div>
                )}


                {isAddingManual && (
                    <Card className="border-primary/20 shadow-lg animate-in fade-in slide-in-from-top-4 overflow-hidden">
                        <Tabs defaultValue="url" className="w-full">
                            <div className="bg-muted/50 px-6 pt-4">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="url" className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Extrair via URL
                                    </TabsTrigger>
                                    <TabsTrigger value="manual" className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Texto Manual
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="url" className="mt-0">
                                <CardHeader>
                                    <CardTitle className="text-lg">Capturar Notícia</CardTitle>
                                    <CardDescription>
                                        Cole o link e o sistema tentará extrair título e conteúdo automaticamente.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Link da Notícia</label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://exemplo.com/noticia-importante"
                                                value={urlToExtract}
                                                onChange={(e) => setUrlToExtract(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleExtractByUrl()}
                                            />
                                            <Button
                                                onClick={handleExtractByUrl}
                                                disabled={isSubmitting || !urlToExtract}
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Sparkles className="h-4 w-4 mr-2" />
                                                )}
                                                Extrair
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-md border border-orange-100 dark:border-orange-900/30">
                                        <p className="text-xs text-orange-800 dark:text-orange-300 flex gap-2">
                                            <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            A notícia será adicionada ao pipeline após a extração bem sucedida. Se a extração falhar, ela aparecerá na lista de revisão abaixo.
                                        </p>
                                    </div>
                                </CardContent>
                            </TabsContent>

                            <TabsContent value="manual" className="mt-0">
                                <CardHeader>
                                    <CardTitle className="text-lg">Conteúdo Manual</CardTitle>
                                    <CardDescription>
                                        Cole o texto ou HTML manualmente quando a extração não for possível.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Título *</label>
                                            <Input
                                                placeholder="Título da notícia"
                                                value={manualEntry.title}
                                                onChange={(e) => setManualEntry({ ...manualEntry, title: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Publisher / Fonte</label>
                                            <Input
                                                placeholder="Ex: BBC, CNN, Blog..."
                                                value={manualEntry.publisher}
                                                onChange={(e) => setManualEntry({ ...manualEntry, publisher: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">URL Original *</label>
                                        <Input
                                            placeholder="https://..."
                                            value={manualEntry.url}
                                            onChange={(e) => setManualEntry({ ...manualEntry, url: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Conteúdo (Texto ou HTML) *</label>
                                        <Textarea
                                            placeholder="Cole aqui o texto completo ou HTML do artigo..."
                                            className="min-h-[200px] font-mono text-sm"
                                            value={manualEntry.content}
                                            onChange={(e) => setManualEntry({ ...manualEntry, content: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button onClick={handleCreateManual} disabled={isSubmitting}>
                                            <Save className="h-4 w-4 mr-2" />
                                            {isSubmitting ? "Salvando..." : "Salvar e Adicionar ao Pipeline"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </TabsContent>
                        </Tabs>
                    </Card>
                )}

                {reviewItems.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-xl font-semibold">Tudo em dia!</h3>
                                <p className="text-muted-foreground text-sm">Não há alertas pendentes de revisão manual no momento.</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6">
                        {displayList.map((entry, idx) => {
                            if (entry.type === 'cluster') {
                                const groupItems = entry.items;
                                // We use the first item's ID as the key for the cluster? Or a unique key
                                return (
                                    <div key={`cluster-${groupItems[0].duplicate_group_id}`} className="relative group">
                                        {/* Batch selection for cluster? Maybe later. For now just the card. */}
                                        <ClusterReviewCard
                                            items={groupItems}
                                            onMerge={mergeItems}
                                            isProcessing={!!processingId}
                                        />
                                    </div>
                                );
                            } else {
                                const item = entry.item;
                                return (
                                    <div key={item.id} className="relative group">
                                        <div className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </div>
                                        <div
                                            className={cn(
                                                "transition-all",
                                                selectedIds.includes(item.id) && "ring-2 ring-primary ring-offset-4 rounded-lg"
                                            )}
                                            onClick={(e) => {
                                                if (e.shiftKey) toggleSelection(item.id);
                                            }}
                                        >
                                            <ReviewCard
                                                item={item}
                                                processingId={processingId}
                                                onRetry={retryItem}
                                                onReject={rejectItem}
                                                onSaveContent={saveManualContentAction}
                                                onClassify={classifyItem}
                                            />
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>

                )}
            </div>
        </DashboardLayout>
    );
}
