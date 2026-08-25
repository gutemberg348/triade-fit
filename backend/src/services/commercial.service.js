export const activateReferralCredit = async (tx, studentId, paymentReference) => {
  const referral = await tx.referral.findFirst({
    where: { studentId, status: "PENDING" },
    include: { partner: true },
  });
  if (!referral) return;

  const creditCents = referral.creditCents || referral.partner.defaultCreditCents;
  await tx.referral.update({
    where: { id: referral.id },
    data: {
      status: "APPROVED",
      creditCents,
      approvedAt: new Date(),
      ...(paymentReference ? { paymentReference } : {}),
    },
  });
  if (!creditCents) return;

  await tx.partnerLedgerEntry.create({
    data: {
      partnerId: referral.partnerId,
      referralId: referral.id,
      type: "CREDIT",
      amountCents: creditCents,
      description: "Crédito por indicação com pagamento confirmado",
    },
  });
  await tx.partnerProfile.update({
    where: { id: referral.partnerId },
    data: { balanceCents: { increment: creditCents } },
  });
};
