import { NextResponse } from "next/server";

type ValidationRule = {
    type: "string" | "number" | "boolean" | "array";
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
};

type ValidationSchema = {
    [key: string]: ValidationRule;
};

export function validateInput(data: any, schema: ValidationSchema): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];

        // Check required
        if (rules.required && (value === undefined || value === null || value === "")) {
            errors.push(`${field} is required`);
            continue;
        }

        // Skip validation if not required and value is empty
        if (value === undefined || value === null || value === "") {
            continue;
        }

        // Type validation
        if (rules.type === "string" && typeof value !== "string") {
            errors.push(`${field} must be a string`);
        }
        if (rules.type === "number" && (typeof value !== "number" || isNaN(value))) {
            errors.push(`${field} must be a number`);
        }
        if (rules.type === "boolean" && typeof value !== "boolean") {
            errors.push(`${field} must be a boolean`);
        }
        if (rules.type === "array" && !Array.isArray(value)) {
            errors.push(`${field} must be an array`);
        }

        // String validations
        if (rules.type === "string" && typeof value === "string") {
            if (rules.min !== undefined && value.length < rules.min) {
                errors.push(`${field} must be at least ${rules.min} characters`);
            }
            if (rules.max !== undefined && value.length > rules.max) {
                errors.push(`${field} must be at most ${rules.max} characters`);
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }
        }

        // Number validations
        if (rules.type === "number" && typeof value === "number") {
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${field} must be at most ${rules.max}`);
            }
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export function validationErrorResponse(errors: string[]) {
    return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
    );
}
