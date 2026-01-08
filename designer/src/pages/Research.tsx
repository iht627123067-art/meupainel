import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    GraduationCap,
    MessageSquare,
    Archive,
    ExternalLink,
    RefreshCw,
    Trash2,
    Edit,
    Plus,
    Tag,
    Search,
    BookOpen,
    FileText,
    Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResearchMaterial {
    id: string;
    title: string;
    content: string | null;
    notes: string | null;
    tags: string[] | null;
    category: string;
    source_url: string | null;
    created_at: string;
    alert_id: string | null;
    alerts?: {
        title: string;
        publisher: string | null;
        clean_url: string | null;
        url: string;
    } | null;
    ai_classifications?: {
        destination: string;
        reasoning: string | null;
    } | null;
}

export default function Research() {
    const [materials, setMaterials] = useState<ResearchMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [editingMaterial, setEditingMaterial] = useState<ResearchMaterial | null>(null);
    const [editNotes, setEditNotes] = useState("");
    const [editTags, setEditTags] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newMaterial, setNewMaterial] = useState({
        title: "",
        content: "",
        notes: "",
        tags: "",
        category: "thesis",
        source_url: "",
    });
    const { toast } = useToast();

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("research_materials")
                .select(`
          *,
          alerts (
            title,
            publisher,
            clean_url,
            url
          )
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Map data to include title fallback from alerts
            const mappedData = (data || []).map((item: any) => ({
                ...item,
                title: item.title || item.alerts?.title || "Sem título",
                content: item.content || null,
                source_url: item.source_url || item.alerts?.clean_url || item.alerts?.url || null,
            }));

            setMaterials(mappedData as ResearchMaterial[]);
        } catch (error: any) {
            toast({
                title: "Erro ao carregar materiais",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const saveNotes = async () => {
        if (!editingMaterial) return;

        try {
            const tags = editTags.split(",").map(t => t.trim()).filter(t => t);

            const { error } = await supabase
                .from("research_materials")
                .update({
                    notes: editNotes,
                    tags: tags.length > 0 ? tags : null,
                })
                .eq("id", editingMaterial.id);

            if (error) throw error;
            toast({ title: "Notas salvas!" });
            setEditingMaterial(null);
            fetchMaterials();
        } catch (error: any) {
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const deleteMaterial = async (id: string) => {
        try {
            const { error } = await supabase
                .from("research_materials")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast({ title: "Material excluído" });
            fetchMaterials();
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const addMaterial = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const tags = newMaterial.tags.split(",").map(t => t.trim()).filter(t => t);

            const { error } = await supabase
                .from("research_materials")
                .insert({
                    user_id: user.id,
                    title: newMaterial.title,
                    content: newMaterial.content || null,
                    notes: newMaterial.notes || null,
                    tags: tags.length > 0 ? tags : null,
                    category: newMaterial.category,
                    source_url: newMaterial.source_url || null,
                });

            if (error) throw error;

            toast({ title: "Material adicionado!" });
            setIsAddDialogOpen(false);
            setNewMaterial({
                title: "",
                content: "",
                notes: "",
                tags: "",
                category: "thesis",
                source_url: "",
            });
            fetchMaterials();
        } catch (error: any) {
            toast({
                title: "Erro ao adicionar",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const openEditDialog = (material: ResearchMaterial) => {
        setEditingMaterial(material);
        setEditNotes(material.notes || "");
        setEditTags(material.tags?.join(", ") || "");
    };

    const categoryIcons: Record<string, typeof GraduationCap> = {
        thesis: GraduationCap,
        debate: MessageSquare,
        archive: Archive,
    };

    const categoryLabels: Record<string, string> = {
        thesis: "Tese/Pesquisa",
        debate: "Debate",
        archive: "Arquivo",
    };

    const categoryColors: Record<string, string> = {
        thesis: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        debate: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        archive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };

    const filteredMaterials = materials.filter((material) => {
        const matchesSearch =
            material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    const thesisMaterials = filteredMaterials.filter(m => m.category === "thesis");
    const debateMaterials = filteredMaterials.filter(m => m.category === "debate");

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <BookOpen className="h-8 w-8 text-blue-500" />
                            Pesquisa
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Material organizado para dissertação e debates
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchMaterials}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar
                        </Button>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por título, notas ou tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas categorias</SelectItem>
                            <SelectItem value="thesis">Tese/Pesquisa</SelectItem>
                            <SelectItem value="debate">Debate</SelectItem>
                            <SelectItem value="archive">Arquivo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium">Tese</span>
                                </div>
                                <span className="text-2xl font-bold">{thesisMaterials.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-orange-500" />
                                    <span className="text-sm font-medium">Debate</span>
                                </div>
                                <span className="text-2xl font-bold">{debateMaterials.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <span className="text-sm font-medium">Total</span>
                                </div>
                                <span className="text-2xl font-bold">{materials.length}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Empty State */}
                {materials.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum material ainda</h3>
                            <p className="text-muted-foreground text-center max-w-sm mb-4">
                                Classifique alertas como "Tese" ou "Debate" no Pipeline para salvá-los aqui automaticamente.
                            </p>
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar manualmente
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Materials Tabs */}
                {materials.length > 0 && (
                    <Tabs defaultValue="all" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="all">Todos ({filteredMaterials.length})</TabsTrigger>
                            <TabsTrigger value="thesis">Tese ({thesisMaterials.length})</TabsTrigger>
                            <TabsTrigger value="debate">Debate ({debateMaterials.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="space-y-4">
                            {filteredMaterials.map((material) => (
                                <MaterialCard
                                    key={material.id}
                                    material={material}
                                    categoryLabels={categoryLabels}
                                    categoryColors={categoryColors}
                                    categoryIcons={categoryIcons}
                                    onEdit={openEditDialog}
                                    onDelete={deleteMaterial}
                                />
                            ))}
                        </TabsContent>

                        <TabsContent value="thesis" className="space-y-4">
                            {thesisMaterials.map((material) => (
                                <MaterialCard
                                    key={material.id}
                                    material={material}
                                    categoryLabels={categoryLabels}
                                    categoryColors={categoryColors}
                                    categoryIcons={categoryIcons}
                                    onEdit={openEditDialog}
                                    onDelete={deleteMaterial}
                                />
                            ))}
                        </TabsContent>

                        <TabsContent value="debate" className="space-y-4">
                            {debateMaterials.map((material) => (
                                <MaterialCard
                                    key={material.id}
                                    material={material}
                                    categoryLabels={categoryLabels}
                                    categoryColors={categoryColors}
                                    categoryIcons={categoryIcons}
                                    onEdit={openEditDialog}
                                    onDelete={deleteMaterial}
                                />
                            ))}
                        </TabsContent>
                    </Tabs>
                )}

                {/* Edit Dialog */}
                <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Editar Notas</DialogTitle>
                            <DialogDescription>
                                {editingMaterial?.title}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Notas</label>
                                <Textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Adicione suas anotações sobre este material..."
                                    className="min-h-[150px]"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Tags (separadas por vírgula)</label>
                                <Input
                                    value={editTags}
                                    onChange={(e) => setEditTags(e.target.value)}
                                    placeholder="metodologia, qualitativo, entrevistas..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingMaterial(null)}>
                                Cancelar
                            </Button>
                            <Button onClick={saveNotes}>
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Dialog */}
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Adicionar Material</DialogTitle>
                            <DialogDescription>
                                Adicione manualmente um material de pesquisa
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Título *</label>
                                <Input
                                    value={newMaterial.title}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                    placeholder="Título do material"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Categoria</label>
                                <Select
                                    value={newMaterial.category}
                                    onValueChange={(value) => setNewMaterial({ ...newMaterial, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="thesis">Tese/Pesquisa</SelectItem>
                                        <SelectItem value="debate">Debate</SelectItem>
                                        <SelectItem value="archive">Arquivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Conteúdo/Resumo</label>
                                <Textarea
                                    value={newMaterial.content}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, content: e.target.value })}
                                    placeholder="Resumo ou principais pontos..."
                                    className="min-h-[100px]"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Notas</label>
                                <Textarea
                                    value={newMaterial.notes}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, notes: e.target.value })}
                                    placeholder="Suas anotações..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Tags (separadas por vírgula)</label>
                                <Input
                                    value={newMaterial.tags}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, tags: e.target.value })}
                                    placeholder="metodologia, qualitativo..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">URL da Fonte</label>
                                <Input
                                    value={newMaterial.source_url}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, source_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={addMaterial} disabled={!newMaterial.title}>
                                Adicionar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}

// Material Card Component
function MaterialCard({
    material,
    categoryLabels,
    categoryColors,
    categoryIcons,
    onEdit,
    onDelete,
}: {
    material: ResearchMaterial;
    categoryLabels: Record<string, string>;
    categoryColors: Record<string, string>;
    categoryIcons: Record<string, typeof GraduationCap>;
    onEdit: (material: ResearchMaterial) => void;
    onDelete: (id: string) => void;
}) {
    const CategoryIcon = categoryIcons[material.category] || Archive;

    return (
        <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2">
                            {material.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(material.created_at).toLocaleDateString("pt-BR")}
                            {material.alerts?.publisher && (
                                <span>• {material.alerts.publisher}</span>
                            )}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={categoryColors[material.category]}>
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {categoryLabels[material.category]}
                    </Badge>
                </div>
            </CardHeader>

            {(material.content || material.notes) && (
                <CardContent className="pb-3">
                    {material.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {material.content}
                        </p>
                    )}
                    {material.notes && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Notas:</p>
                            <p className="line-clamp-2">{material.notes}</p>
                        </div>
                    )}
                </CardContent>
            )}

            {material.tags && material.tags.length > 0 && (
                <CardContent className="pt-0 pb-3">
                    <div className="flex flex-wrap gap-1">
                        {material.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="h-2.5 w-2.5 mr-1" />
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            )}

            <CardFooter className="justify-between gap-2 pt-3 border-t">
                <div className="flex gap-2">
                    {(material.source_url || material.alerts?.clean_url || material.alerts?.url) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(
                                material.source_url || material.alerts?.clean_url || material.alerts?.url,
                                "_blank"
                            )}
                        >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Fonte
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(material)}
                    >
                        <Edit className="h-4 w-4 mr-1" />
                        Notas
                    </Button>
                </div>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(material.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
