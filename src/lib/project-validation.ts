import { z } from "zod";

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(200, "Project name is too long"),
    description: z.string().trim().max(2000, "Description is too long").optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    memberEmails: z.array(z.string().email()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(200, "Project name is too long"),
    description: z.string().trim().max(2000, "Description is too long").optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["endDate"],
    },
  );

export const addMemberSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export type CreateProjectValues = z.infer<typeof createProjectSchema>;
export type UpdateProjectValues = z.infer<typeof updateProjectSchema>;
export type AddMemberValues = z.infer<typeof addMemberSchema>;
