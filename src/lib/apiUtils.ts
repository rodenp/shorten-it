import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string; // Optional: specific error code for client-side handling
    issues?: any; // For validation errors from Zod
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Handles API errors, logs them, and returns a standardized JSON error response.
 * @param error - The error object.
 *  @param defaultMessage - A generic message to send to the client if error.message is not suitable.
 * @param status - HTTP status code for the response.
 * @returns NextResponse object with the standardized error.
 */
export function handleApiError(
  error: any, 
  defaultMessage: string = "An internal server error occurred.", 
  status: number = 500
): NextResponse<ApiErrorResponse> {
  
  let responseMessage = defaultMessage;
  let issues;

  // Log the detailed error server-side
  console.error("[API Error Handler]", error);

  if (error instanceof ZodError) {
    responseMessage = "Validation failed.";
    issues = error.flatten().fieldErrors;
    status = 400; // Bad Request for validation errors
  } else if (error.message) {
    // Use specific messages for known error types if safe, otherwise default
    if (status !== 500 || process.env.NODE_ENV === 'development') { // Allow more detail in dev
        // Or check for specific error types that are safe to expose
        if (error.message.includes("taken") || error.message.includes("conflict") || error.message.includes("not found") || error.message.includes("Unauthorized")) {
            responseMessage = error.message;
        }
    }
  }
  
  // Adjust status for specific known error messages if not already set by Zod
  if (status === 500) { // Only re-evaluate status if it's a generic 500
    if (responseMessage.includes("taken") || responseMessage.includes("conflict")) status = 409;
    else if (responseMessage.includes("not found")) status = 404;
    else if (responseMessage.includes("Unauthorized") || responseMessage.includes("Forbidden")) status = error.message.includes("Unauthorized") ? 401 : 403;
    else if (responseMessage.includes("Invalid")) status = 400; // For general invalid input not caught by Zod
  }


  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: {
        message: responseMessage,
        ...(issues && { issues }), // Conditionally add issues for Zod errors
      },
    },
    { status }
  );
}

/**
 * Creates a standardized success JSON response.
 * @param data - The data payload to send.
 * @param status - HTTP status code for the response (defaults to 200).
 * @returns NextResponse object with the standardized success response.
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json<ApiSuccessResponse<T>>(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Creates a standardized "no content" success response.
 * Typically used for DELETE operations.
 * @returns NextResponse object with 204 status.
 */
export function noContentResponse(): NextResponse {
    return new NextResponse(null, { status: 204 });
}
