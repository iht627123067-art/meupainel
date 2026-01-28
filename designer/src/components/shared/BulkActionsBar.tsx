import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mic, CheckCircle, Search, X, ChevronDown, Bot, Zap, Sparkles, ClipboardEdit } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
    selectedCount: number;
    maxSelection: number;
    onClear: () => void;
    onSendToPodcast: (mode: 'deep' | 'quick' | 'chatgpt-full' | 'chatgpt-quick') => void;
    onSendToReview?: () => void;
    onBatchApprove: () => void;
    onSendToResearch: () => void;
    isProcessing: boolean;
}

export function BulkActionsBar({
    selectedCount,
    maxSelection,
    onClear,
    onSendToPodcast,
    onSendToReview,
    onBatchApprove,
    onSendToResearch,
    isProcessing,
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    const isOverLimit = selectedCount > maxSelection;

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            "md:sticky md:top-0 md:bottom-auto md:border-b md:border-t-0"
        )}>
            <div className="container flex items-center justify-between gap-4 py-3 px-4">
                <div className="flex items-center gap-3">
                    <Badge variant={isOverLimit ? "destructive" : "default"} className="text-sm">
                        {selectedCount} {selectedCount === 1 ? "item" : "itens"}
                    </Badge>
                    {isOverLimit && (
                        <span className="text-xs text-destructive">
                            Máximo: {maxSelection}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClear}
                        disabled={isProcessing}
                    >
                        <X className="h-4 w-4 mr-2" />
                        Limpar
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBatchApprove}
                        disabled={isProcessing}
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                    </Button>

                    {onSendToReview && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSendToReview}
                            disabled={isProcessing}
                            className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/20 dark:border-orange-900/40"
                        >
                            <ClipboardEdit className="h-4 w-4 mr-2" />
                            Revisar
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSendToResearch}
                        disabled={isProcessing}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Pesquisar
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="sm"
                                disabled={isProcessing || isOverLimit}
                            >
                                <Mic className="h-4 w-4 mr-2" />
                                Podcast
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuItem onClick={() => onSendToPodcast('deep')}>
                                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                                <span>Personalizado (Completo)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSendToPodcast('quick')}>
                                <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                                <span>Rápido (Alertas do Gmail)</span>
                            </DropdownMenuItem>
                            <div className="h-px bg-muted my-1" />
                            <DropdownMenuItem onClick={() => onSendToPodcast('chatgpt-full')} className="bg-primary/5 focus:bg-primary/10">
                                <Bot className="mr-2 h-4 w-4 text-primary" />
                                <div className="flex flex-col">
                                    <span className="font-medium">ChatGPT Premium (Completo)</span>
                                    <span className="text-[10px] text-muted-foreground">Usa cota do OpenAI (Pago)</span>
                                </div>
                                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1 bg-primary/10 text-amber-500 font-bold border-none">
                                    PRO
                                </Badge>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSendToPodcast('chatgpt-quick')} className="bg-primary/5 focus:bg-primary/10">
                                <Bot className="mr-2 h-4 w-4 text-primary" />
                                <div className="flex flex-col">
                                    <span className="font-medium">ChatGPT Premium (Rápido)</span>
                                    <span className="text-[10px] text-muted-foreground">Resumo rápido Gmail (Pago)</span>
                                </div>
                                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1 bg-primary/10 text-amber-500 font-bold border-none">
                                    PRO
                                </Badge>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}
