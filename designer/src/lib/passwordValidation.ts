// Password Validation Utility
// Provides strong password validation as compensation for lack of leaked password protection

export interface PasswordStrength {
    score: number; // 0-100
    level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
    isValid: boolean;
}

export interface PasswordRequirements {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
};

// Common weak passwords to block
const COMMON_WEAK_PASSWORDS = [
    'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
    'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
    'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
];

// Common patterns to detect
const SEQUENTIAL_PATTERNS = [
    '123', '234', '345', '456', '567', '678', '789',
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh',
    'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio', 'iop',
    'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
];

/**
 * Validates password strength and provides feedback
 */
export function validatePasswordStrength(
    password: string,
    requirements: Partial<PasswordRequirements> = {}
): PasswordStrength {
    const reqs = { ...DEFAULT_REQUIREMENTS, ...requirements };
    const feedback: string[] = [];
    let score = 0;

    // Check minimum length
    if (password.length < reqs.minLength) {
        feedback.push(`Senha deve ter no mínimo ${reqs.minLength} caracteres`);
    } else {
        score += 20;
        // Bonus for extra length
        score += Math.min(20, (password.length - reqs.minLength) * 2);
    }

    // Check uppercase
    const hasUppercase = /[A-Z]/.test(password);
    if (reqs.requireUppercase && !hasUppercase) {
        feedback.push('Senha deve conter letras maiúsculas');
    } else if (hasUppercase) {
        score += 15;
    }

    // Check lowercase
    const hasLowercase = /[a-z]/.test(password);
    if (reqs.requireLowercase && !hasLowercase) {
        feedback.push('Senha deve conter letras minúsculas');
    } else if (hasLowercase) {
        score += 15;
    }

    // Check numbers
    const hasNumbers = /\d/.test(password);
    if (reqs.requireNumbers && !hasNumbers) {
        feedback.push('Senha deve conter números');
    } else if (hasNumbers) {
        score += 15;
    }

    // Check special characters
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password);
    if (reqs.requireSpecialChars && !hasSpecialChars) {
        feedback.push('Senha deve conter caracteres especiais (!@#$%^&* etc)');
    } else if (hasSpecialChars) {
        score += 15;
    }

    // Check for common weak passwords
    const lowerPassword = password.toLowerCase();
    if (COMMON_WEAK_PASSWORDS.some(weak => lowerPassword.includes(weak))) {
        feedback.push('Senha muito comum. Escolha uma senha mais única');
        score = Math.min(score, 30);
    }

    // Check for sequential patterns
    const hasSequential = SEQUENTIAL_PATTERNS.some(pattern =>
        lowerPassword.includes(pattern)
    );
    if (hasSequential) {
        feedback.push('Evite sequências óbvias (123, abc, qwerty)');
        score -= 10;
    }

    // Check for repeated characters
    const hasRepeated = /(.)\1{2,}/.test(password);
    if (hasRepeated) {
        feedback.push('Evite caracteres repetidos (aaa, 111)');
        score -= 10;
    }

    // Check for keyboard patterns
    const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '1qaz2wsx'];
    if (keyboardPatterns.some(pattern => lowerPassword.includes(pattern))) {
        feedback.push('Evite padrões de teclado (qwerty, asdfgh)');
        score -= 10;
    }

    // Bonus for character variety
    const uniqueChars = new Set(password).size;
    const varietyBonus = Math.min(10, (uniqueChars / password.length) * 20);
    score += varietyBonus;

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine level
    let level: PasswordStrength['level'];
    if (score < 40) level = 'weak';
    else if (score < 60) level = 'fair';
    else if (score < 75) level = 'good';
    else if (score < 90) level = 'strong';
    else level = 'very-strong';

    // Add positive feedback for strong passwords
    if (score >= 75 && feedback.length === 0) {
        feedback.push('Senha forte! ✓');
    }

    const isValid = feedback.length === 0 ||
        (feedback.length === 1 && feedback[0].includes('✓'));

    return {
        score,
        level,
        feedback,
        isValid,
    };
}

/**
 * Get color for password strength indicator
 */
export function getPasswordStrengthColor(level: PasswordStrength['level']): string {
    switch (level) {
        case 'weak': return 'bg-red-500';
        case 'fair': return 'bg-orange-500';
        case 'good': return 'bg-yellow-500';
        case 'strong': return 'bg-blue-500';
        case 'very-strong': return 'bg-green-500';
    }
}

/**
 * Get label for password strength
 */
export function getPasswordStrengthLabel(level: PasswordStrength['level']): string {
    switch (level) {
        case 'weak': return 'Muito Fraca';
        case 'fair': return 'Fraca';
        case 'good': return 'Boa';
        case 'strong': return 'Forte';
        case 'very-strong': return 'Muito Forte';
    }
}

/**
 * Generate a strong password suggestion
 */
export function generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
