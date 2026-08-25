export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  name: true,
  phone: true,
  birthDate: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
  studentProfile: {
    select: {
      id: true,
      objective: true,
      initialHeightCm: true,
      accessStatus: true,
      accessExpiresAt: true,
      partnerProfile: {
        select: {
          id: true,
          referralCode: true,
          active: true,
          balanceCents: true,
          defaultCreditCents: true,
        },
      },
    },
  },
};
