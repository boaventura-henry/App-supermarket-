import { getAccessToken } from "./authService";

export async function apiRequest<T>(url: string, init: RequestInit = {}, fallbackMessage = "Nao foi possivel acessar a API.") {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = await getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Falha de rede ao acessar API.", { url, error });
    }
    throw new Error("Sem conexao com o servidor. Verifique sua internet e tente novamente.");
  }

  const body = await readApiBody<T>(response);

  if (!response.ok || !body?.success) {
    if (import.meta.env.DEV) {
      console.error("API retornou erro.", { url, status: response.status, requestId: body?.requestId });
    }
    throw new Error(body.message ?? fallbackMessage);
  }

  return body.data as T;
}

type ApiBody<T> = {
  success: boolean;
  message?: string;
  data?: T;
  requestId?: string;
};

async function readApiBody<T>(response: Response): Promise<ApiBody<T>> {
  try {
    return (await response.json()) as ApiBody<T>;
  } catch {
    return {
      success: false,
      message: response.ok ? "Resposta inesperada do servidor." : "Nao foi possivel concluir a operacao."
    };
  }
}
