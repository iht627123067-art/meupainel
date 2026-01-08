import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePipeline } from "@/hooks/usePipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, RefreshCw, XCircle, CheckCircle, Save, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ReviewPage() {
    const { items, fetchItems, retryItem, rejectItem, processingId } = usePipeline();
    const reviewItems = items.needs_review || [];
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState("");

    const startEditing = (id: string, currentUrl: string) => {
        setEditingId(id);
        setEditUrl(currentUrl);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditUrl("");
    };

    const saveUrl = async (id: string) => {
        try {
            const { error } = await supabase
                .from("alerts")
                .update({ url: editUrl, clean_url: editUrl })
                .eq("id", id);

            if (error) throw error;

            toast({ title: "URL atualizada com sucesso" });

            // Retry extraction immediately with new URL
            await retryItem(id, editUrl);

            setEditingId(null);
            fetchItems(true);
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar URL",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-orange-500" />
                        Revisão Manual
                    </h1>
                    <p className="text-muted-foreground">
                        Itens que falharam na extração ou requerem atenção
                    </p>
                </div>

                {reviewItems.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold">Tudo limpo!</h3>
                            <p className="text-muted-foreground">Não há itens pendentes de revisão.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {reviewItems.map((item) => (
                            <Card key={item.id} className="border-l-4 border-l-orange-500">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">{item.title}</CardTitle>
                                            <CardDescription>
                                                {item.publisher} • {new Date(item.created_at).toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">
                                            Needs Review
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">URL do Artigo:</label>
                                        <div className="flex gap-2">
                                            {editingId === item.id ? (
                                                <div className="flex-1 flex gap-2">
                                                    <Input
                                                        value={editUrl}
                                                        onChange={(e) => setEditUrl(e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <Button size="sm" onClick={() => saveUrl(item.id)} disabled={processingId === item.id}>
                                                        {processingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                        <span className="ml-2">Salvar & Re-extrair</span>
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center gap-2 bg-muted/50 p-2 rounded-md text-sm break-all">
                                                    <span className="flex-1 line-clamp-1">{item.url}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 ml-auto shrink-0"
                                                        onClick={() => startEditing(item.id, item.url)}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline shrink-0"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        {item.source_url && (
                                            <div className="text-xs text-muted-foreground">
                                                Fonte original RSS: <span className="font-mono bg-muted px-1 rounded">{item.source_url}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 bg-muted/20 py-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => rejectItem(item.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Rejeitar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => retryItem(item.id, item.url)}
                                        disabled={processingId === item.id}
                                    >
                                        {processingId === item.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                        )}
                                        Tentar Novamente
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
