import { z } from 'zod';

// Committee validation schemas
export const createCommitteeSchema = z.object({
  name: z.string().min(1, 'Committee name is required').max(255),
  code: z.string().min(1, 'Committee code is required').max(50),
  district: z.string().default('KAKINADA'),
  state: z.string().default('Andhra Pradesh'),
  hasCheckposts: z.boolean().default(false),
});

export const updateCommitteeSchema = createCommitteeSchema.partial();

// Checkpost validation schemas
export const createCheckpostSchema = z.object({
  name: z.string().min(1, 'Checkpost name is required').max(255),
  committeeId: z.string().min(1, 'Committee ID is required'),
  location: z.string().optional(),
});

export const updateCheckpostSchema = createCheckpostSchema.partial();

// Receipt validation schemas
export const createReceiptSchema = z.object({
  bookNumber: z.string().min(1, 'Book number is required'),
  receiptNumber: z.string().min(1, 'Receipt number is required'),
  date: z.string().datetime('Invalid date format'),
  traderName: z.string().min(1, 'Trader name is required'),
  payeeName: z.string().min(1, 'Payee name is required'),
  commodity: z.string().min(1, 'Commodity is required'),
  transactionValue: z.number().positive('Transaction value must be positive'),
  marketFee: z.number().positive('Market fee must be positive'),
  natureOfReceipt: z.enum(['MF', 'OTHERS']),
  natureOfReceiptOther: z.string().optional(),
  collectionLocation: z.enum(['OFFICE', 'CHECKPOST', 'SUPERVISOR']),
  collectionLocationOther: z.string().optional(),
  checkpostId: z.string().optional(),
  supervisorName: z.string().optional(),
  committeeId: z.string().min(1, 'Committee ID is required'),
  financialYear: z.string().min(1, 'Financial year is required'),
  remarks: z.string().optional(),
});

export const updateReceiptSchema = createReceiptSchema.partial();

// Target validation schemas
export const createTargetSchema = z.object({
  committeeId: z.string().min(1, 'Committee ID is required'),
  financialYear: z.string().min(1, 'Financial year is required'),
  yearlyTarget: z.number().positive('Yearly target must be positive'),
  description: z.string().optional(),
  monthlyTargets: z.array(z.object({
    month: z.enum(['MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL']),
    amount: z.number().positive('Monthly target must be positive'),
  })),
  checkpostTargets: z.array(z.object({
    checkpostId: z.string().min(1, 'Checkpost ID is required'),
    month: z.enum(['MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL']),
    amount: z.number().positive('Checkpost target must be positive'),
  })).optional(),
});

export const updateTargetSchema = createTargetSchema.partial();

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER', 'VIEWER']).default('USER'),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Query parameter validation
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  financialYear: z.string().optional(),
});

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}