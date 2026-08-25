import { prisma } from "../config/prisma.js";
import { publicUserSelect } from "../utils/selects.js";

export const me = async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.id },
    select: publicUserSelect,
  });
  res.json(user);
};

export const updateMe = async (req, res) => {
  const profileData = {};
  if (req.body.objective !== undefined)
    profileData.objective = req.body.objective;
  if (req.body.initialHeightCm !== undefined)
    profileData.initialHeightCm = req.body.initialHeightCm;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: req.body.name,
      phone: req.body.phone,
      birthDate: req.body.birthDate ? new Date(req.body.birthDate) : null,
      avatarUrl: req.body.avatarUrl,
      ...(req.user.role === "STUDENT" && Object.keys(profileData).length
        ? { studentProfile: { update: profileData } }
        : {}),
    },
    select: publicUserSelect,
  });
  res.json(user);
};
