import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import {
  createCardPayment,
  createInitialPlanCheckout,
  createPixPayment,
  ensureAsaasCustomer,
  getPayment,
  getPixQrCode,
} from "../services/asaas.service.js";
import { activateReferralCredit } from "../services/commercial.service.js";
import { calculatePlan, getAppConfig } from "../services/app-config.service.js";
import { AppError } from "../utils/AppError.js";

const accessEndDate = (months = 12) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

const paidStatuses = ["CONFIRMED", "RECEIVED"];
const statusFromAsaas = (status) => ({
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  RECEIVED: "RECEIVED",
  OVERDUE: "OVERDUE",
  REFUNDED: "REFUNDED",
  DELETED: "CANCELLED",
}[status]);

const studentReadyForPayment = async (studentId) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!student) throw new AppError(404, "Perfil de aluna não encontrado.");
  if (student.accessStatus === "ACTIVE")
    throw new AppError(409, "Seu acesso já está ativo.");
  if (["BLOCKED", "CANCELLED"].includes(student.accessStatus))
    throw new AppError(
      403,
      "Seu acesso está indisponível. Fale com a equipe Triade FIT.",
    );
  return student;
};

const newPaymentOrder = ({ student, plan, paymentMethod, amountCents }) =>
  prisma.paymentOrder.create({
    data: {
      studentId: student.id,
      planCode: plan.code,
      amountCents,
      paymentMethod,
      durationMonths: plan.durationMonths,
      externalReference: `triade:${student.id}:${crypto.randomUUID()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

const releasePaidOrder = async ({ orderId, providerStatus, customerId }) =>
  prisma.$transaction(async (tx) => {
    const order = await tx.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, "Pedido não encontrado.");
    const alreadyPaid = ["CONFIRMED", "RECEIVED"].includes(order.status);
    const status = statusFromAsaas(providerStatus) || order.status;
    await tx.paymentOrder.update({
      where: { id: order.id },
      data: {
        status,
        ...(!alreadyPaid && paidStatuses.includes(providerStatus)
          ? { paidAt: new Date() }
          : {}),
      },
    });
    if (!alreadyPaid && paidStatuses.includes(providerStatus)) {
      await tx.studentProfile.update({
        where: { id: order.studentId },
        data: {
          accessStatus: "ACTIVE",
          accessExpiresAt: accessEndDate(order.durationMonths),
          ...(customerId ? { gatewayCustomerId: customerId } : {}),
        },
      });
      await activateReferralCredit(tx, order.studentId, order.externalReference);
    }
    return { released: !alreadyPaid && paidStatuses.includes(providerStatus), status };
  });

const billingFrom = (body) => ({
  cpfCnpj: body.cpfCnpj,
  phone: body.phone,
  postalCode: body.postalCode,
  address: body.address,
  addressNumber: body.addressNumber,
  complement: body.complement,
  province: body.province,
});

export const createPix = async (req, res) => {
  const student = await studentReadyForPayment(req.user.studentId);
  const plan = calculatePlan(await getAppConfig());
  const billing = billingFrom(req.body);
  const customerId = await ensureAsaasCustomer({ student, billing });
  await prisma.studentProfile.update({
    where: { id: student.id },
    data: { gatewayCustomerId: customerId },
  });

  const existing = await prisma.paymentOrder.findFirst({
    where: {
      studentId: student.id,
      planCode: plan.code,
      paymentMethod: "PIX",
      amountCents: plan.pix.totalCents,
      status: "PENDING",
      providerPaymentId: { not: null },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const qrCode = await getPixQrCode(existing.providerPaymentId);
    return res.json({
      paymentId: existing.providerPaymentId,
      status: existing.status,
      amountCents: existing.amountCents,
      encodedImage: qrCode.encodedImage,
      payload: qrCode.payload,
      expirationDate: qrCode.expirationDate,
    });
  }

  const order = await newPaymentOrder({
    student,
    plan,
    paymentMethod: "PIX",
    amountCents: plan.pix.totalCents,
  });
  try {
    const { payment, qrCode } = await createPixPayment({
      order,
      customerId,
      plan,
    });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        providerPaymentId: payment.id,
        checkoutUrl: payment.invoiceUrl || null,
      },
    });
    res.status(201).json({
      paymentId: payment.id,
      status: payment.status,
      amountCents: order.amountCents,
      encodedImage: qrCode.encodedImage,
      payload: qrCode.payload,
      expirationDate: qrCode.expirationDate,
    });
  } catch (error) {
    await prisma.paymentOrder.delete({ where: { id: order.id } }).catch(() => null);
    throw error;
  }
};

export const payCard = async (req, res) => {
  const student = await studentReadyForPayment(req.user.studentId);
  const plan = calculatePlan(await getAppConfig());
  const billing = billingFrom(req.body);
  const card = {
    cardHolderName: req.body.cardHolderName,
    cardNumber: req.body.cardNumber,
    expiryMonth: req.body.expiryMonth,
    expiryYear: req.body.expiryYear,
    cvv: req.body.cvv,
  };
  const customerId = await ensureAsaasCustomer({ student, billing });
  const order = await newPaymentOrder({
    student,
    plan,
    paymentMethod: "CREDIT_CARD",
    amountCents: plan.card.totalCents,
  });
  const forwardedIp = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  const remoteIp = forwardedIp || req.ip;
  try {
    const payment = await createCardPayment({
      order,
      customerId,
      customer: student.user,
      billing,
      card,
      plan,
      remoteIp,
    });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        providerPaymentId: payment.id,
        checkoutUrl: payment.invoiceUrl || null,
        ...(!paidStatuses.includes(payment.status)
          ? { status: statusFromAsaas(payment.status) || "PENDING" }
          : {}),
      },
    });
    const outcome = paidStatuses.includes(payment.status)
      ? await releasePaidOrder({
          orderId: order.id,
          providerStatus: payment.status,
          customerId,
        })
      : { released: false, status: statusFromAsaas(payment.status) || "PENDING" };
    res.status(201).json({
      paymentId: payment.id,
      status: outcome.status,
      accessReleased: outcome.released,
      amountCents: order.amountCents,
      cardLastFour: payment.creditCard?.creditCardNumber || null,
    });
  } catch (error) {
    await prisma.paymentOrder.delete({ where: { id: order.id } }).catch(() => null);
    throw error;
  }
};

export const syncLatestPayment = async (req, res) => {
  const order = await prisma.paymentOrder.findFirst({
    where: {
      studentId: req.user.studentId,
      providerPaymentId: { not: null },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!order)
    throw new AppError(404, "Nenhum pagamento aguardando confirmação.");
  const payment = await getPayment(order.providerPaymentId);
  const outcome = await releasePaidOrder({
    orderId: order.id,
    providerStatus: payment.status,
    customerId: payment.customer,
  });
  res.json({
    paymentId: payment.id,
    status: outcome.status,
    accessReleased: outcome.released || paidStatuses.includes(payment.status),
  });
};

export const myStatus = async (req, res) => {
  const plan = calculatePlan(await getAppConfig());
  const latestOrder = await prisma.paymentOrder.findFirst({
    where: { studentId: req.user.studentId },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      checkoutUrl: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  res.json({
    plan,
    accessStatus: req.user.studentProfile.accessStatus,
    accessExpiresAt: req.user.studentProfile.accessExpiresAt,
    order: latestOrder,
  });
};

export const createCheckout = async (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const plan = calculatePlan(await getAppConfig());
  const amountCents =
    paymentMethod === "CREDIT_CARD" ? plan.card.totalCents : plan.pix.totalCents;
  const student = await prisma.studentProfile.findUnique({
    where: { id: req.user.studentId },
  });
  if (!student) throw new AppError(404, "Perfil de aluna não encontrado.");
  if (student.accessStatus === "ACTIVE")
    throw new AppError(409, "Seu acesso já está ativo.");
  if (["BLOCKED", "CANCELLED"].includes(student.accessStatus))
    throw new AppError(403, "Seu acesso está indisponível. Fale com a equipe Triade FIT.");

  const now = new Date();
  const existing = await prisma.paymentOrder.findFirst({
    where: {
      studentId: student.id,
      planCode: plan.code,
      paymentMethod,
      amountCents,
      status: "PENDING",
      checkoutUrl: { not: null },
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing)
    return res.json({
      checkoutUrl: existing.checkoutUrl,
      expiresAt: existing.expiresAt,
      plan,
      paymentMethod,
    });

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const order = await prisma.paymentOrder.create({
    data: {
      studentId: student.id,
      planCode: plan.code,
      amountCents,
      paymentMethod,
      durationMonths: plan.durationMonths,
      externalReference: `essenza:${student.id}:${crypto.randomUUID()}`,
      expiresAt,
    },
  });

  try {
    const checkout = await createInitialPlanCheckout({
      order,
      plan,
      paymentMethod,
    });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        providerCheckoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });
    res.status(201).json({
      checkoutUrl: checkout.checkoutUrl,
      expiresAt,
      plan,
      paymentMethod,
    });
  } catch (error) {
    await prisma.paymentOrder.delete({ where: { id: order.id } }).catch(() => null);
    throw error;
  }
};

export const asaasWebhook = async (req, res) => {
  if (
    !env.ASAAS_WEBHOOK_TOKEN ||
    req.get("asaas-access-token") !== env.ASAAS_WEBHOOK_TOKEN
  )
    throw new AppError(401, "Webhook não autorizado.");

  const providerEventId = req.body?.id;
  const event = req.body?.event;
  const payment = req.body?.payment;
  if (!providerEventId || !event)
    throw new AppError(400, "Evento do Asaas inválido.");

  const outcome = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentWebhookEvent.createMany({
      data: { providerEventId, event },
      skipDuplicates: true,
    });
    if (!created.count) return { duplicate: true };

    const order = await tx.paymentOrder.findFirst({
      where: {
        OR: [
          ...(payment?.id ? [{ providerPaymentId: payment.id }] : []),
          ...(payment?.externalReference
            ? [{ externalReference: payment.externalReference }]
            : []),
        ],
      },
    });
    if (!order) return { ignored: true };

    await tx.paymentWebhookEvent.update({
      where: { providerEventId },
      data: { paymentOrderId: order.id },
    });

    const paymentData = {
      ...(payment?.id ? { providerPaymentId: payment.id } : {}),
    };
    if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event)) {
      const status = event === "PAYMENT_RECEIVED" ? "RECEIVED" : "CONFIRMED";
      const alreadyPaid = ["CONFIRMED", "RECEIVED"].includes(order.status);
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          ...paymentData,
          status,
          ...(!alreadyPaid ? { paidAt: new Date() } : {}),
        },
      });
      if (!alreadyPaid) {
        await tx.studentProfile.update({
          where: { id: order.studentId },
          data: {
            accessStatus: "ACTIVE",
            accessExpiresAt: accessEndDate(order.durationMonths),
            ...(payment?.customer ? { gatewayCustomerId: payment.customer } : {}),
          },
        });
        await activateReferralCredit(tx, order.studentId, order.externalReference);
      }
      return { released: !alreadyPaid };
    }

    const statusByEvent = {
      PAYMENT_OVERDUE: "OVERDUE",
      PAYMENT_DELETED: "CANCELLED",
      PAYMENT_REFUNDED: "REFUNDED",
    };
    const status = statusByEvent[event];
    if (status) {
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { ...paymentData, status },
      });
      if (event === "PAYMENT_REFUNDED")
        await tx.studentProfile.update({
          where: { id: order.studentId },
          data: { accessStatus: "BLOCKED" },
        });
    }
    return { processed: true };
  });
  // O Asaas considera HTTP 200 como confirmação da entrega, inclusive em duplicatas.
  res.status(200).json({ received: true, ...outcome });
};

export const checkoutReturn = (req, res) => {
  const label = {
    success: "Pagamento enviado",
    cancelled: "Pagamento cancelado",
    expired: "Link de pagamento expirado",
  }[req.query.state] || "Pagamento Triade FIT";
  res
    .status(200)
    .type("html")
    .send(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Triade FIT</title><body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#100b0a;color:#fff;font-family:Arial,sans-serif"><main style="max-width:360px;padding:28px;text-align:center"><p style="color:#f3ae7d;font-size:12px;font-weight:bold;letter-spacing:1.5px">TRIADE FIT</p><h1>${label}</h1><p style="color:#d6c7c0;line-height:1.5">Volte ao aplicativo. A liberação ocorre automaticamente assim que o Asaas confirmar o pagamento.</p></main></body></html>`);
};
