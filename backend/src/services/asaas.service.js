import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const baseUrl = () =>
  env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

const errorMessage = (body) => {
  const descriptions = body?.errors
    ?.map((error) => error?.description)
    .filter(Boolean);
  return descriptions?.length
    ? descriptions.join(" ")
    : "O Asaas não conseguiu processar esta solicitação.";
};

const errorDetails = (message) => {
  const fieldErrors = {};
  const rules = [
    [/cpf|cnpj/i, "cpfCnpj"],
    [/telefone|celular|phone/i, "phone"],
    [/cep|postal/i, "postalCode"],
    [/bairro|province/i, "province"],
    [/endere[cç]o|address/i, "address"],
    [/n[uú]mero do cart[aã]o|cart[aã]o.*inv[aá]lid/i, "cardNumber"],
    [/validade|expir/i, "expiryYear"],
    [/cvv|c[oó]digo de seguran[cç]a/i, "cvv"],
  ];
  for (const [pattern, field] of rules)
    if (pattern.test(message)) fieldErrors[field] = [message];
  return { fieldErrors, formErrors: [] };
};

const asaasRequest = async (path, { method = "GET", body } = {}) => {
  if (!env.ASAAS_API_KEY)
    throw new AppError(
      503,
      "Pagamento ainda não está configurado. Configure a chave do Asaas no servidor.",
    );
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Triade-FIT/1.0",
      access_token: env.ASAAS_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = errorMessage(data);
    // Nunca registre o corpo enviado: pagamentos com cartão contêm dados sensíveis.
    console.error("Asaas API error", response.status, message);
    throw new AppError(
      response.status === 400 || response.status === 404 ? 422 : 502,
      message,
      errorDetails(message),
    );
  }
  return data;
};

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
const dueDate = () => new Date().toISOString().slice(0, 10);

const customerPayload = ({ student, billing }) => ({
  name: student.user.name,
  email: student.user.email,
  cpfCnpj: onlyDigits(billing.cpfCnpj),
  mobilePhone: onlyDigits(billing.phone),
  postalCode: onlyDigits(billing.postalCode),
  address: billing.address.trim(),
  addressNumber: billing.addressNumber.trim(),
  ...(billing.complement?.trim()
    ? { complement: billing.complement.trim() }
    : {}),
  province: billing.province.trim(),
  externalReference: student.id,
  notificationDisabled: true,
});

export async function ensureAsaasCustomer({ student, billing }) {
  const params = new URLSearchParams({
    externalReference: student.id,
    limit: "1",
  });
  const result = await asaasRequest(`/customers?${params}`);
  const existing = result.data?.[0];
  if (existing?.id) {
    await asaasRequest(`/customers/${existing.id}`, {
      method: "PUT",
      body: customerPayload({ student, billing }),
    });
    return existing.id;
  }
  const created = await asaasRequest("/customers", {
    method: "POST",
    body: customerPayload({ student, billing }),
  });
  return created.id;
}

export async function createPixPayment({ order, customerId, plan }) {
  const payment = await asaasRequest("/payments", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "PIX",
      value: order.amountCents / 100,
      dueDate: dueDate(),
      description: plan.description,
      externalReference: order.externalReference,
    },
  });
  const qrCode = await getPixQrCode(payment.id);
  return { payment, qrCode };
}

export const getPixQrCode = (paymentId) =>
  asaasRequest(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`);

export async function createCardPayment({
  order,
  customerId,
  customer,
  billing,
  card,
  plan,
  remoteIp,
}) {
  const installments = Math.max(1, Number(plan.card.installments || 1));
  return asaasRequest("/payments", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "CREDIT_CARD",
      ...(installments > 1
        ? {
            installmentCount: installments,
            totalValue: order.amountCents / 100,
          }
        : { value: order.amountCents / 100 }),
      dueDate: dueDate(),
      description: plan.description,
      externalReference: order.externalReference,
      creditCard: {
        holderName: card.cardHolderName.trim(),
        number: onlyDigits(card.cardNumber),
        expiryMonth: onlyDigits(card.expiryMonth).padStart(2, "0"),
        expiryYear: onlyDigits(card.expiryYear),
        ccv: onlyDigits(card.cvv),
      },
      creditCardHolderInfo: {
        name: card.cardHolderName.trim(),
        email: customer.email,
        cpfCnpj: onlyDigits(billing.cpfCnpj),
        postalCode: onlyDigits(billing.postalCode),
        addressNumber: billing.addressNumber.trim(),
        ...(billing.complement?.trim()
          ? { addressComplement: billing.complement.trim() }
          : {}),
        mobilePhone: onlyDigits(billing.phone),
      },
      ...(remoteIp ? { remoteIp } : {}),
    },
  });
}

export const getPayment = (paymentId) =>
  asaasRequest(`/payments/${encodeURIComponent(paymentId)}`);

const checkoutReturnUrl = (state) => {
  if (!env.PUBLIC_BASE_URL)
    throw new AppError(
      503,
      "Pagamento ainda não está configurado. Defina PUBLIC_BASE_URL no servidor.",
    );
  return new URL(`/api/billing/checkout-return?state=${state}`, env.PUBLIC_BASE_URL).toString();
};

export async function createInitialPlanCheckout({ order, plan, paymentMethod }) {
  if (!env.ASAAS_API_KEY)
    throw new AppError(
      503,
      "Pagamento ainda não está configurado. Configure a chave do Asaas no servidor.",
    );

  const response = await fetch(`${baseUrl()}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: env.ASAAS_API_KEY,
    },
    body: JSON.stringify({
      billingTypes: [paymentMethod],
      chargeTypes:
        paymentMethod === "CREDIT_CARD" && plan.card.installments > 1
          ? ["DETACHED", "INSTALLMENT"]
          : ["DETACHED"],
      ...(paymentMethod === "CREDIT_CARD" && plan.card.installments > 1
        ? { installment: { maxInstallmentCount: plan.card.installments } }
        : {}),
      minutesToExpire: 24 * 60,
      externalReference: order.externalReference,
      callback: {
        successUrl: checkoutReturnUrl("success"),
        cancelUrl: checkoutReturnUrl("cancelled"),
        expiredUrl: checkoutReturnUrl("expired"),
      },
      items: [
        {
          externalReference: order.externalReference,
          name: plan.title,
          description:
            paymentMethod === "CREDIT_CARD" && plan.card.interestPercent > 0
              ? `${plan.description}. Cartão com ${plan.card.interestPercent}% de juros já incluídos no total.`
              : plan.description,
          quantity: 1,
          value: order.amountCents / 100,
        },
      ],
      // No Checkout hospedado, o próprio Asaas coleta CPF, endereço e telefone.
      // Enviar somente nome/e-mail (dados incompletos) faz a Sandbox recusar a
      // criação do link com HTTP 400. Quando houver cadastro fiscal completo,
      // estes dados poderão ser preenchidos aqui como customerData.
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Asaas checkout error", response.status, body);
    throw new AppError(
      502,
      "Não foi possível iniciar o pagamento. Tente novamente em instantes.",
    );
  }
  if (!body.id || !body.link)
    throw new AppError(502, "O Asaas não devolveu o link de pagamento.");
  return { checkoutId: body.id, checkoutUrl: body.link };
}
