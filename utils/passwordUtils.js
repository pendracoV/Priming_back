// Validación de contraseña
const validatePassword = (password) => {
    if (!password || typeof password !== 'string' || password.trim() === '') {
        return false;
    }
    
    // Verificar requisitos de seguridad (al menos una mayúscula, un número y 6 caracteres)
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasMinLength = password.length >= 6;
    
    return hasUpperCase && hasNumber && hasMinLength;
};

// Validación de email
const validateEmail = (email) => {
    if (!email || typeof email !== 'string' || email.trim() === '') {
        return false;
    }
    
    // Expresión regular para validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

module.exports = {
    validatePassword,
    validateEmail
};