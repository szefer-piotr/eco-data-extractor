import { useState } from 'react';

interface ValidationRules {
  [key: string]: {
    required?: boolean | string;
    minLength?: number | { value: number; message: string };
    maxLength?: number | { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    custom?: (value: any) => string | null;
  };
}

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (name: string, value: any): boolean => {
    const rule = rules[name];
    if (!rule) return true;

    let error = '';

    if (rule.required) {
      const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
      if (isEmpty) {
        error = typeof rule.required === 'string' ? rule.required : `${name} is required`;
      }
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
      return false;
    }

    if (rule.minLength && typeof value === 'string') {
      const minLen = typeof rule.minLength === 'number' ? rule.minLength : rule.minLength.value;
      const message = typeof rule.minLength === 'number' ? `Minimum ${minLen} characters` : rule.minLength.message;
      if (value.length < minLen) {
        error = message;
      }
    }

    if (rule.maxLength && typeof value === 'string') {
      const maxLen = typeof rule.maxLength === 'number' ? rule.maxLength : rule.maxLength.value;
      const message = typeof rule.maxLength === 'number' ? `Maximum ${maxLen} characters` : rule.maxLength.message;
      if (value.length > maxLen) {
        error = message;
      }
    }

    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.value.test(value)) {
        error = rule.pattern.message;
      }
    }

    if (rule.custom && !error) {
      error = rule.custom(value) || '';
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
      return false;
    }

    setErrors((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
    return true;
  };

  const clearError = (name: string) => {
    setErrors((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  };

  const clearErrors = () => setErrors({});

  return { errors, validate, clearError, clearErrors };
};

export default useFormValidation;
