import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

export function errorResponse(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  pagination: ApiResponse['pagination'],
  message?: string
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data,
    pagination,
    message,
  });
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }
  
  return errorResponse('Internal server error', 500);
}