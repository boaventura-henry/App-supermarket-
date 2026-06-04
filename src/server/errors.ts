export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        message: error.statusCode >= 500 ? "Nao foi possivel concluir a operacao agora." : error.message
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      success: false,
      message: "Erro interno do servidor"
    }
  };
}
