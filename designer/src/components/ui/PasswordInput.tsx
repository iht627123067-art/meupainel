import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    validatePasswordStrength,
    getPasswordStrengthColor,
    getPasswordStrengthLabel,
    generateStrongPassword,
    type PasswordStrength
} from '@/lib/passwordValidation';
import { Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';

interface PasswordInputProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    showStrengthIndicator?: boolean;
    showGenerateButton?: boolean;
    className?: string;
}

export function PasswordInput({
    value,
    onChange,
    label = 'Senha',
    placeholder = 'Digite sua senha',
    showStrengthIndicator = true,
    showGenerateButton = true,
    className = '',
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState<PasswordStrength | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (value && showStrengthIndicator) {
            const result = validatePasswordStrength(value);
            setStrength(result);
        } else {
            setStrength(null);
        }
    }, [value, showStrengthIndicator]);

    const handleGeneratePassword = () => {
        const newPassword = generateStrongPassword(16);
        onChange(newPassword);
        setShowPassword(true);
    };

    const handleCopyPassword = async () => {
        if (value) {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const strengthColor = strength ? getPasswordStrengthColor(strength.level) : 'bg-gray-300';
    const strengthLabel = strength ? getPasswordStrengthLabel(strength.level) : '';

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Label */}
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>

            {/* Input Container */}
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />

                {/* Action Buttons */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {/* Copy Button */}
                    {value && (
                        <button
                            type="button"
                            onClick={handleCopyPassword}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Copiar senha"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                    )}

                    {/* Show/Hide Button */}
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                        {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                            <Eye className="w-4 h-4 text-gray-500" />
                        )}
                    </button>
                </div>
            </div>

            {/* Generate Password Button */}
            {showGenerateButton && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="w-full"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerar Senha Forte
                </Button>
            )}

            {/* Strength Indicator */}
            {showStrengthIndicator && strength && (
                <div className="space-y-2">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Força da senha:</span>
                            <span className={`font-medium ${strength.level === 'weak' ? 'text-red-500' :
                                    strength.level === 'fair' ? 'text-orange-500' :
                                        strength.level === 'good' ? 'text-yellow-500' :
                                            strength.level === 'strong' ? 'text-blue-500' :
                                                'text-green-500'
                                }`}>
                                {strengthLabel}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${strengthColor}`}
                                style={{ width: `${strength.score}%` }}
                            />
                        </div>
                    </div>

                    {/* Feedback Messages */}
                    {strength.feedback.length > 0 && (
                        <Alert variant={strength.isValid ? 'default' : 'destructive'} className="py-2">
                            <AlertDescription>
                                <ul className="text-xs space-y-1">
                                    {strength.feedback.map((message, index) => (
                                        <li key={index} className="flex items-start gap-1">
                                            <span className="mt-0.5">
                                                {message.includes('✓') ? '✓' : '•'}
                                            </span>
                                            <span>{message.replace('✓', '').trim()}</span>
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Password Tips */}
            {!value && showStrengthIndicator && (
                <Alert className="py-2">
                    <AlertDescription className="text-xs">
                        <strong>Dicas para senha forte:</strong>
                        <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                            <li>Use no mínimo 12 caracteres</li>
                            <li>Combine letras maiúsculas e minúsculas</li>
                            <li>Inclua números e caracteres especiais</li>
                            <li>Evite palavras comuns e sequências óbvias</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
