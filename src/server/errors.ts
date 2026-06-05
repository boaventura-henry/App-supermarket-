export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        message: error.message
      }
    };
  }

  console.error("Unhandled API error", error);
  return {
    statusCode: 500,
    body: {
      success: false,
      message: "Erro interno do servidor"
    }
  };
}
