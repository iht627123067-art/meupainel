import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePipeline } from "@/hooks/usePipeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, PlusCircle, Save, X, FileText, Link2, Sparkles, Loader2, XCircle, Search, Filter, BarChart3, ArrowUpDown, Calendar, Tag } from "lucide-react";
import { ReviewCard, CATEGORIES } from "@/components/pipeline/ReviewCard";
import { ClusterReviewCard } from "@/components/pipeline/ClusterReviewCard";
import { createManualEntry, createAlertAndExtract } from "@/services/api/content.service";
import { useToast } from "@/hooks/use-toast";
import { cn, getDisplayUrl } from "@/lib/utils";

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
        content: "",
        date: new Date().toISOString().split('T')[0]
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [minScore, setMinScore] = useState<number>(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // New filter states
    const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "score_desc" | "source">("date_desc");
    const [filterSource, setFilterSource] = useState<string>("all");
    const [filterPeriod, setFilterPeriod] = useState<"24h" | "7d" | "30d" | "all">("all");
    const [filterHasKeywords, setFilterHasKeywords] = useState<"all" | "with" | "without">("all");


    const reviewItems = items.needs_review || [];

    // Extract unique publishers for filter dropdown
    const uniquePublishers = useMemo(() => {
        const publishers = new Set<string>();
        reviewItems.forEach(item => {
            if (item.publisher) publishers.add(item.publisher);
        });
        return Array.from(publishers).sort();
    }, [reviewItems]);

    // Advanced filtering logic
    const filteredItems = useMemo(() => {
        let filtered = reviewItems.filter(item => {
            // Text search
            const title = item.title || "";
            const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.publisher && item.publisher.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

            // Score filter
            const matchesScore = (item.personalization_score || 0) >= minScore;
            if (!matchesScore) return false;

            // Source filter
            if (filterSource !== "all" && item.publisher !== filterSource) return false;

            // Period filter
            if (filterPeriod !== "all") {
                const itemDate = new Date(item.created_at);
                const now = new Date();
                const hoursDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);

                if (filterPeriod === "24h" && hoursDiff > 24) return false;
                if (filterPeriod === "7d" && hoursDiff > 24 * 7) return false;
                if (filterPeriod === "30d" && hoursDiff > 24 * 30) return false;
            }

            // Keywords filter
            if (filterHasKeywords === "with" && (!item.keywords || item.keywords.length === 0)) return false;
            if (filterHasKeywords === "without" && item.keywords && item.keywords.length > 0) return false;

            return true;
        });

        // Sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "date_desc":
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case "date_asc":
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case "score_desc":
                    return (b.personalization_score || 0) - (a.personalization_score || 0);
                case "source":
                    return (a.publisher || "").localeCompare(b.publisher || "");
                default:
                    return 0;
            }
        });

        return filtered;
    }, [reviewItems, searchTerm, minScore, filterSource, filterPeriod, filterHasKeywords, sortBy]);

    const displayList = useMemo(() => {
        const list = filteredItems.reduce((acc, item) => {
            if (item.duplicate_group_id) {
                // Safer search for existing clusters
                const existingGroup = acc.find(x =>
                    x.type === 'cluster' &&
                    x.items &&
                    x.items.length > 0 &&
                    x.items[0].duplicate_group_id === item.duplicate_group_id
                ) as { type: 'cluster', items: any[] } | undefined;

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
        list.sort((a, b) => {
            const scoreA = a.type === 'single' ? (a.item.personalization_score || 0) : Math.max(...a.items.map(i => i.personalization_score || 0));
            const scoreB = b.type === 'single' ? (b.item.personalization_score || 0) : Math.max(...b.items.map(i => i.personalization_score || 0));
            return scoreB - scoreA;
        });

        return list;
    }, [filteredItems]);


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
                if (item) await retryItem(id, getDisplayUrl(item));
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
                manualEntry.content,
                manualEntry.date
            );

            toast({
                title: "Notícia criada com sucesso!",
                description: "O item foi adicionado ao pipeline como extraído.",
            });

            setIsAddingManual(false);
            setManualEntry({ title: "", url: "", publisher: "", content: "", date: new Date().toISOString().split('T')[0] });
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
            <div className="max-w-6xl mx-auto space-y-6 px-4 pb-8">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    Revisão Manual
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {reviewItems.length > 0
                                        ? `${reviewItems.length} ${reviewItems.length === 1 ? 'item' : 'itens'} pendentes de revisão`
                                        : 'Nenhum item pendente'
                                    }
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsAddingManual(!isAddingManual)}
                            variant={isAddingManual ? "secondary" : "default"}
                            size="lg"
                            className="shadow-sm"
                        >
                            {isAddingManual ? <X className="h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                            {isAddingManual ? "Cancelar" : "Adicionar Notícia"}
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    {reviewItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total de Itens</p>
                                            <p className="text-2xl font-bold mt-1">{reviewItems.length}</p>
                                        </div>
                                        <BarChart3 className="h-8 w-8 text-blue-500 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-green-500">
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Filtrados</p>
                                            <p className="text-2xl font-bold mt-1">{filteredItems.length}</p>
                                        </div>
                                        <Filter className="h-8 w-8 text-green-500 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-purple-500">
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Selecionados</p>
                                            <p className="text-2xl font-bold mt-1">{selectedIds.length}</p>
                                        </div>
                                        <CheckCircle className="h-8 w-8 text-purple-500 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>


                {/* Filters Row */}
                {reviewItems.length > 0 && (
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {/* First row: Search and Score */}
                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2 w-full">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <Search className="h-4 w-4 text-muted-foreground" />
                                            Pesquisar
                                        </label>
                                        <Input
                                            placeholder="Filtrar por título ou fonte..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="w-full sm:w-48 space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-muted-foreground" />
                                            Score Mínimo: <span className="text-primary font-bold">{minScore}</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="range"
                                                min="0"
                                                max="15"
                                                value={minScore}
                                                onChange={(e) => setMinScore(parseInt(e.target.value))}
                                                className="flex-1 h-2"
                                            />
                                            <span className="text-sm font-mono text-muted-foreground min-w-[2rem] text-right">{minScore}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Second row: Advanced filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Sort By */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                            Ordenar por
                                        </label>
                                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="date_desc">Mais recentes</SelectItem>
                                                <SelectItem value="date_asc">Mais antigas</SelectItem>
                                                <SelectItem value="score_desc">Maior score</SelectItem>
                                                <SelectItem value="source">Por fonte (A-Z)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Source */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            Fonte
                                        </label>
                                        <Select value={filterSource} onValueChange={setFilterSource}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas as fontes</SelectItem>
                                                {uniquePublishers.map(publisher => (
                                                    <SelectItem key={publisher} value={publisher}>
                                                        {publisher}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Period */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            Período
                                        </label>
                                        <Select value={filterPeriod} onValueChange={(value: any) => setFilterPeriod(value)}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="24h">Últimas 24h</SelectItem>
                                                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                                                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Filter by Keywords */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-muted-foreground" />
                                            Temas
                                        </label>
                                        <Select value={filterHasKeywords} onValueChange={(value: any) => setFilterHasKeywords(value)}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="with">Com temas</SelectItem>
                                                <SelectItem value="without">Sem temas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Clear filters button and stats */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Mostrando <strong className="text-foreground">{filteredItems.length}</strong> de <strong className="text-foreground">{reviewItems.length}</strong> itens</span>
                                        {filteredItems.length < reviewItems.length && (
                                            <Badge variant="secondary" className="ml-2">
                                                {reviewItems.length - filteredItems.length} ocultos
                                            </Badge>
                                        )}
                                    </div>
                                    {(searchTerm || minScore > 0 || filterSource !== "all" || filterPeriod !== "all" || filterHasKeywords !== "all" || sortBy !== "date_desc") && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setMinScore(0);
                                                setFilterSource("all");
                                                setFilterPeriod("all");
                                                setFilterHasKeywords("all");
                                                setSortBy("date_desc");
                                            }}
                                            className="h-9"
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Limpar Todos os Filtros
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Batch Actions Toolbar */}
                {selectedIds.length > 0 && (
                    <Card className="sticky top-4 z-50 border-primary/30 shadow-lg bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Badge variant="default" className="h-7 px-3 text-sm font-semibold">
                                        {selectedIds.length} {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedIds([])}
                                        className="h-8"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Desmarcar Todos
                                    </Button>
                                </div>

                                <div className="flex-1 hidden lg:flex items-center gap-2 border-x px-6 mx-2">
                                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Classificar como:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {CATEGORIES.map(cat => (
                                            <Button
                                                key={cat.id}
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-7 px-3 text-xs font-medium border transition-all hover:scale-105",
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

                                <div className="flex items-center gap-2 w-full lg:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBatchRetry}
                                        disabled={isSubmitting}
                                        className="h-9 border-primary/30 flex-1 lg:flex-initial"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4 mr-2" />
                                        )}
                                        Extrair
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleBatchReject}
                                        disabled={isSubmitting}
                                        className="h-9 flex-1 lg:flex-initial"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <XCircle className="h-4 w-4 mr-2" />
                                        )}
                                        Rejeitar
                                    </Button>
                                </div>
                            </div>

                            {/* Mobile Classification Buttons */}
                            <div className="lg:hidden mt-4 pt-4 border-t">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Classificar como:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {CATEGORIES.map(cat => (
                                        <Button
                                            key={cat.id}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-2 text-xs font-medium border",
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
                        </CardContent>
                    </Card>
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
                                        <div className="md:col-span-2 space-y-2">
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
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Data da Notícia</label>
                                            <Input
                                                type="date"
                                                value={manualEntry.date}
                                                onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
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
                    <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="h-20 w-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-semibold">Tudo em dia!</h3>
                                <p className="text-muted-foreground max-w-md">
                                    Não há alertas pendentes de revisão manual no momento.
                                    Todos os itens foram processados com sucesso ou você pode adicionar novos conteúdos manualmente.
                                </p>
                            </div>
                            {!isAddingManual && (
                                <Button
                                    onClick={() => setIsAddingManual(true)}
                                    variant="outline"
                                    className="mt-4"
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Adicionar Nova Notícia
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : filteredItems.length === 0 ? (
                    <Card className="border-dashed border-2 border-orange-200 dark:border-orange-800">
                        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                            <div className="h-16 w-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                                <Search className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold">Nenhum item encontrado</h3>
                                <p className="text-muted-foreground text-sm">
                                    Nenhum item corresponde aos filtros aplicados. Tente ajustar os critérios de busca.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSearchTerm(""); setMinScore(0); }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Limpar Filtros
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <span>
                                Mostrando <strong className="text-foreground">{filteredItems.length}</strong> de <strong className="text-foreground">{reviewItems.length}</strong> itens
                            </span>
                            <span className="text-xs">
                                Dica: Use Shift+Click para seleção múltipla
                            </span>
                        </div>
                        <div className="grid gap-4">
                            {displayList.map((entry, idx) => {
                                if (entry.type === 'cluster') {
                                    const groupItems = entry.items;
                                    return (
                                        <div
                                            key={`cluster-${groupItems[0].duplicate_group_id}`}
                                            className="relative animate-in fade-in slide-in-from-bottom-4"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <ClusterReviewCard
                                                items={groupItems}
                                                onMerge={mergeItems}
                                                isProcessing={!!processingId}
                                            />
                                        </div>
                                    );
                                } else {
                                    const item = entry.item;
                                    const isSelected = selectedIds.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            className="relative group animate-in fade-in slide-in-from-bottom-4"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <div className={cn(
                                                "absolute -left-12 top-1/2 -translate-y-1/2 z-10 transition-all",
                                                "opacity-0 group-hover:opacity-100",
                                                isSelected && "opacity-100"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(item.id)}
                                                    className="h-5 w-5 rounded border-2 border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                                                />
                                            </div>
                                            <div
                                                className={cn(
                                                    "transition-all duration-200 rounded-lg",
                                                    isSelected && "ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.01]"
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
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
