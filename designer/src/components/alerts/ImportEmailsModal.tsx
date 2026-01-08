import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    processGoogleAlertEmail,
    toAlertDatabaseRecord,
    ExtractedArticle,
} from "@/services/gmailService";
import { Loader2, Upload, CheckCircle, AlertCircle, FileText } from "lucide-react";

interface ImportEmailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ImportEmailsModal({ isOpen, onClose, onSuccess }: ImportEmailsModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [emailHtml, setEmailHtml] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<ExtractedArticle[]>([]);
    const [step, setStep] = useState<"input" | "preview" | "importing">("input");

    const handlePreview = () => {
        if (!emailHtml.trim()) {
            toast({
                title: "HTML do email necessário",
                description: "Cole o HTML do email do Google Alerts",
                variant: "destructive",
            });
            return;
        }

        const articles = processGoogleAlertEmail({
            html: emailHtml,
            subject: emailSubject || "Google Alert",
            date: new Date().toISOString(),
            id: `manual-${Date.now()}`,
        });

        if (articles.length === 0) {
            toast({
                title: "Nenhum artigo encontrado",
                description: "Verifique se o HTML é de um email do Google Alerts",
                variant: "destructive",
            });
            return;
        }

        setPreview(articles);
        setStep("preview");
    };

    const handleImport = async () => {
        if (!user) return;

        setStep("importing");
        setIsProcessing(true);

        try {
            const records = preview.map((article) => toAlertDatabaseRecord(article, user.id));

            const { error } = await supabase.from("alerts").insert(records);

            if (error) throw error;

            toast({
                title: "Importação concluída!",
                description: `${records.length} alertas importados com sucesso`,
            });

            // Reset state
            setEmailHtml("");
            setEmailSubject("");
            setPreview([]);
            setStep("input");
            onSuccess?.();
            onClose();
        } catch (error: any) {
            toast({
                title: "Erro na importação",
                description: error.message,
                variant: "destructive",
            });
            setStep("preview");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setEmailHtml("");
        setEmailSubject("");
        setPreview([]);
        setStep("input");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Importar Emails do Google Alerts
                    </DialogTitle>
                    <DialogDescription>
                        {step === "input" && "Cole o HTML do email do Google Alerts para extrair os artigos"}
                        {step === "preview" && `${preview.length} artigos encontrados. Revise antes de importar.`}
                        {step === "importing" && "Importando artigos..."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === "input" && (
                        <div className="space-y-4">
                            <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertDescription>
                                    Para obter o HTML: abra o email no Gmail → clique nos 3 pontos → "Mostrar original" → copie o conteúdo HTML.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label htmlFor="subject">Assunto do Email (opcional)</Label>
                                <input
                                    id="subject"
                                    className="w-full px-3 py-2 border rounded-md bg-background"
                                    placeholder="Ex: Google Alert - Inteligência Artificial"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="html">HTML do Email *</Label>
                                <Textarea
                                    id="html"
                                    placeholder="Cole o HTML do email aqui..."
                                    className="min-h-[200px] font-mono text-xs"
                                    value={emailHtml}
                                    onChange={(e) => setEmailHtml(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {step === "preview" && (
                        <div className="space-y-3">
                            {preview.map((article, index) => (
                                <div
                                    key={index}
                                    className="p-4 border rounded-lg space-y-2 bg-muted/30"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-medium text-sm line-clamp-2">{article.title}</h4>
                                        <div className="flex gap-1 shrink-0">
                                            <Badge variant="outline" className="text-xs">
                                                {article.type}
                                            </Badge>
                                            {article.valid ? (
                                                <Badge variant="default" className="text-xs bg-green-500">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Válido
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    Inválido
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {article.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {article.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium">{article.publisher || "Fonte desconhecida"}</span>
                                        <span>•</span>
                                        <a
                                            href={article.cleanUrl || article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="truncate hover:underline text-primary"
                                        >
                                            {article.cleanUrl || article.url}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {step === "importing" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Importando {preview.length} artigos...</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === "input" && (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handlePreview}>
                                Visualizar Artigos
                            </Button>
                        </>
                    )}

                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("input")}>
                                Voltar
                            </Button>
                            <Button onClick={handleImport} disabled={isProcessing}>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Importar {preview.length} Artigos
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
