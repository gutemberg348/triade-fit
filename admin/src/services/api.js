import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333/api",
  timeout: 15000,
});
let refreshPromise;
let sessionExpiredHandler = () => {};

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler || (() => {});
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = () => {};
  };
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("essenza.accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      original?._retry ||
      original?.url?.includes("/auth/")
    )
      return Promise.reject(error);
    original._retry = true;
    const refreshToken = localStorage.getItem("essenza.refreshToken");
    if (!refreshToken) return Promise.reject(error);
    refreshPromise ||= axios
      .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
      .finally(() => {
        refreshPromise = null;
      });
    try {
      const { data } = await refreshPromise;
      localStorage.setItem("essenza.accessToken", data.accessToken);
      localStorage.setItem("essenza.refreshToken", data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      localStorage.removeItem("essenza.accessToken");
      localStorage.removeItem("essenza.refreshToken");
      localStorage.removeItem("essenza.user");
      sessionExpiredHandler();
      return Promise.reject(refreshError);
    }
  },
);

const fieldLabels = {
  name: "Nome",
  email: "E-mail",
  password: "Senha",
  passwordConfirmation: "Confirmação da senha",
  phone: "Telefone",
  birthDate: "Data de nascimento",
  objective: "Objetivo",
  notes: "Observações",
  title: "Título",
  description: "Descrição",
  coverUrl: "Capa",
  videoUrl: "Vídeo",
  programId: "Programa",
  moduleId: "Módulo",
  unlockDelayDays: "Liberação do módulo",
  isIntroductory: "Destaque da Home",
  durationMinutes: "Duração",
  category: "Categoria",
  difficulty: "Nível",
  materials: "Materiais",
  measuredAt: "Data da avaliação",
  referralCode: "Código de indicação",
  defaultCreditCents: "Crédito por indicação",
  amountCents: "Valor",
  audience: "Público",
  studentIds: "Alunas selecionadas",
  authorName: "Autor",
  message: "Mensagem",
  imageUrl: "Imagem",
  loginImageUrl: "Imagem de login",
  homeBannerUrl: "Banner inicial",
  paymentBannerUrl: "Banner de pagamento",
  planTitle: "Nome do plano",
  planDescription: "Descrição do plano",
  planDurationMonths: "Duração do plano",
  pixPriceCents: "Preço no Pix",
  cardBasePriceCents: "Preço no cartão",
  cardInstallments: "Parcelas",
  cardInterestPercent: "Juros",
};

const readableField = (field) => fieldLabels[field] || field;

export const validationErrors = (error) => {
  const fields = error.response?.data?.details?.fieldErrors || {};
  return Object.fromEntries(
    Object.entries(fields).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? [...new Set(messages)].join(" ") : messages,
    ]),
  );
};

export const errorMessage = (error) => {
  const fields = validationErrors(error);
  const entries = Object.entries(fields);
  const formErrors = error.response?.data?.details?.formErrors || [];
  if (entries.length || formErrors.length) {
    return [
      "Revise os dados informados:",
      ...entries.map(
        ([field, message]) => `• ${readableField(field)}: ${message}`,
      ),
      ...formErrors.map((message) => `• ${message}`),
    ].join("\n");
  }
  return error.response?.data?.error || "Não foi possível concluir a ação.";
};
export default api;
