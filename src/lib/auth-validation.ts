
import { z } from "zod";

/**
 * Shared authentication form validation.
 * Rules:
 * - All mandatory fields must be present.
 * - Email must have a valid format.
 * - Password must contain at least eight characters.
 * - Password and confirmation must match.
 */

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required"),

    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address"),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),

    role: z.enum(["project_manager", "team_member"], {
      required_error: "Please select a role",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),

  password: z.string().min(1, "Password is required"),

  role: z.enum(["admin", "project_manager", "team_member"], {
    required_error: "Please select a role",
  }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type ForgotPasswordValues = z.infer<
  typeof forgotPasswordSchema
>;
export type ResetPasswordValues = z.infer<
  typeof resetPasswordSchema
>