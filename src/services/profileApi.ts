import { apiRequest } from "./apiClient";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getProfile() {
  return apiRequest<Profile>("/api/me", {}, "Nao foi possivel carregar o perfil.");
}

export function updateProfile(name: string) {
  return apiRequest<Profile>(
    "/api/me",
    {
      method: "PUT",
      body: JSON.stringify({ name })
    },
    "Nao foi possivel atualizar o perfil."
  );
}
