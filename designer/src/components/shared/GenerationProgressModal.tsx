import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface GenerationProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: 'preparing' | 'generating' | 'saving' | 'complete' | 'error';
    modelName?: string;
    error?: string;
}

export function GenerationProgressModal({
    isOpen,
    onClose,
    stage,
    modelName = "IA",
    error,
}: GenerationProgressModalProps) {
    const navigate = useNavigate();
    const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(3);

    useEffect(() => {
        if (stage === 'complete') {
            const interval = setInterval(() => {
                setAutoRedirectCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        navigate('/podcast');
                        onClose();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [stage, navigate, onClose]);

    const getStageInfo = () => {
        switch (stage) {
            case 'preparing':
                return {
                    icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
                    title: "Preparando dados...",
                    description: "Carregando os alertas selecionados"
                };
            case 'generating':
                return {
                    icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
                    title: "Gerando roteiro com IA...",
                    description: `Usando ${modelName} para criar seu podcast`
                };
            case 'saving':
                return {
                    icon: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
                    title: "Salvando episódio...",
                    description: "Finalizando o processo"
                };
            case 'complete':
                return {
                    icon: <CheckCircle className="h-12 w-12 text-success" />,
                    title: "Podcast gerado com sucesso!",
                    description: `Redirecionando em ${autoRedirectCountdown}s...`
                };
            case 'error':
                return {
                    icon: <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center text-destructive text-2xl">!</div>,
                    title: "Erro ao gerar podcast",
                    description: error || "Ocorreu um erro inesperado"
                };
        }
    };

    const stageInfo = getStageInfo();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {stageInfo.icon}
                        <DialogTitle className="text-center text-xl">{stageInfo.title}</DialogTitle>
                        <DialogDescription className="text-center">
                            {stageInfo.description}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {stage === 'complete' && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={() => {
                                navigate('/podcast');
                                onClose();
                            }}
                            className="flex-1"
                        >
                            Ver Episódio
                        </Button>
                    </div>
                )}

                {stage === 'error' && (
                    <Button
                        variant="destructive"
                        onClick={onClose}
                        className="w-full"
                    >
                        Fechar
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
