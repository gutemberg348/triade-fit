import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import {
  contentAssetInput,
  contentAssets,
  requestBaseUrl,
} from "../utils/publicUrl.js";
import { AppError } from "../utils/AppError.js";
import { publicUserSelect } from "../utils/selects.js";
import {
  createMeasurement,
  evolution,
  serializeMeasurement,
} from "../services/measurement.service.js";
import { activateReferralCredit } from "../services/commercial.service.js";

const nextOrder = async (model, where = {}, client = prisma) => {
  const last = await client[model].findFirst({
    where,
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
};

const ensureContentProgram = async (tx) => {
  const existing = await tx.program.findFirst({
    where: { type: "CONTENT", status: { not: "ARCHIVED" } },
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;
  const program = await tx.program.create({
    data: {
      type: "CONTENT",
      title: "Conteúdos Triade FIT",
      description: "Módulos e aulas exibidos na Home do aplicativo.",
      coverUrl: "/brand/triade-fit-home.png",
      status: "PUBLISHED",
      sortOrder: await nextOrder("program", {}, tx),
    },
  });
  await assignPublishedProgramToAllStudents(tx, program.id);
  return program;
};

const ensureTrainingModule = async (tx, programId) => {
  const existing = await tx.module.findFirst({
    where: { programId, status: { not: "ARCHIVED" } },
    orderBy: { sortOrder: "asc" },
  });
  if (existing) return existing;
  return tx.module.create({
    data: {
      programId,
      title: "Aulas",
      description: "Aulas deste programa de treino.",
      coverUrl: "/brand/triade-fit-focus.png",
      status: "PUBLISHED",
      sortOrder: 0,
    },
  });
};

const validateIntroductoryLesson = async (
  tx,
  { moduleId, isIntroductory },
) => {
  if (!isIntroductory) return;
  const module = await tx.module.findUnique({
    where: { id: moduleId },
    select: { program: { select: { type: true } } },
  });
  if (module?.program.type !== "CONTENT")
    throw new AppError(422, "Somente aulas dos módulos da Home podem ser introdutórias.");
};

const assignPublishedProgramToAllStudents = async (tx, programId) => {
  const students = await tx.studentProfile.findMany({
    where: { user: { status: "ACTIVE" } },
    select: { id: true },
  });
  if (!students.length) return;
  await tx.studentProgram.createMany({
    data: students.map((student) => ({ studentId: student.id, programId })),
    skipDuplicates: true,
  });
};

const referralCodeFor = (name) =>
  `ESS${name.replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const dashboard = async (_req, res) => {
  const [
    totalStudents,
    activeStudents,
    totalLessons,
    totalModules,
    newStudents,
    completedLessons,
    recentLogins,
    recentMeasurements,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.lesson.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.module.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.user.count({
      where: {
        role: "STUDENT",
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    }),
    prisma.lessonProgress.count({ where: { completed: true } }),
    prisma.user.findMany({
      where: { role: "STUDENT", lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 5,
      select: { id: true, name: true, avatarUrl: true, lastLoginAt: true },
    }),
    prisma.bodyMeasurement.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        student: { select: { user: { select: { id: true, name: true } } } },
      },
    }),
  ]);
  res.json({
    metrics: {
      totalStudents,
      activeStudents,
      totalLessons,
      totalModules,
      newStudents,
      completedLessons,
    },
    recentLogins,
    recentMeasurements: recentMeasurements.map(serializeMeasurement),
  });
};

export const listStudents = async (req, res) => {
  const { page, limit, search, status } = req.validatedQuery || req.query;
  const where = {
    role: "STUDENT",
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        ...publicUserSelect,
        _count: { select: { notifications: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

export const listPartners = async (_req, res) =>
  res.json(
    await prisma.partnerProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { referrals: true } },
        referrals: {
          where: { status: "APPROVED" },
          select: { id: true },
        },
      },
    }),
  );

export const upsertStudentPartner = async (req, res) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId: req.params.id, user: { role: "STUDENT" } },
    include: { user: { select: { name: true } }, partnerProfile: true },
  });
  if (!student) throw new AppError(404, "Aluno não encontrado.");
  const referralCode = req.body.referralCode || student.partnerProfile?.referralCode || referralCodeFor(student.user.name);
  const partner = await prisma.partnerProfile.upsert({
    where: { studentId: student.id },
    update: { ...req.body, referralCode },
    create: { studentId: student.id, ...req.body, referralCode },
    include: { student: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  res.json(partner);
};

export const addPartnerCredit = async (req, res) => {
  const partner = await prisma.partnerProfile.findUnique({ where: { id: req.params.id } });
  if (!partner) throw new AppError(404, "Parceiro não encontrado.");
  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.partnerLedgerEntry.create({
      data: { partnerId: partner.id, type: "ADJUSTMENT", ...req.body },
    });
    await tx.partnerProfile.update({
      where: { id: partner.id },
      data: { balanceCents: { increment: req.body.amountCents } },
    });
    return created;
  });
  res.status(201).json(entry);
};

export const getStudent = async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, role: "STUDENT" },
    select: {
      ...publicUserSelect,
      studentProfile: {
        include: {
          partnerProfile: true,
          receivedReferral: {
            include: {
              partner: {
                include: { student: { include: { user: { select: { name: true, email: true } } } } },
              },
            },
          },
          enrollments: {
            include: {
              program: { select: { id: true, title: true, status: true } },
            },
          },
          measurements: {
            orderBy: { measuredAt: "desc" },
            include: { recordedBy: { select: { name: true } } },
          },
          progressPhotos: { orderBy: { takenAt: "desc" } },
          lessonProgress: {
            where: { completed: true },
            orderBy: { completedAt: "desc" },
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  module: { select: { title: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) throw new AppError(404, "Aluno não encontrado.");
  user.studentProfile.measurements =
    user.studentProfile.measurements.map(serializeMeasurement);
  res.json({ ...user, evolution: await evolution(user.studentProfile.id) });
};

export const createStudent = async (req, res) => {
  const { password, objective, initialHeightCm, programIds, partnerId, ...userData } =
    req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const partner = partnerId
      ? await tx.partnerProfile.findFirst({ where: { id: partnerId, active: true } })
      : null;
    if (partnerId && !partner)
      throw new AppError(422, "Parceiro de indicação não encontrado ou inativo.");
    const created = await tx.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase(),
        birthDate: userData.birthDate ? new Date(userData.birthDate) : undefined,
        passwordHash,
        role: "STUDENT",
        studentProfile: {
          create: {
            objective,
            initialHeightCm,
            enrollments: {
              create: programIds.map((programId) => ({ programId })),
            },
          },
        },
      },
      select: publicUserSelect,
    });
    if (partner && created.studentProfile) {
      await tx.referral.create({
        data: {
          partnerId: partner.id,
          studentId: created.studentProfile.id,
          creditCents: partner.defaultCreditCents,
        },
      });
    }
    return created;
  });
  res.status(201).json(user);
};

export const updateStudent = async (req, res) => {
  const {
    objective,
    notes,
    initialHeightCm,
    programIds,
    accessStatus,
    accessExpiresAt,
    gatewayCustomerId,
    partnerId,
    ...userData
  } = req.body;
  if (userData.email) userData.email = userData.email.toLowerCase();
  if ("birthDate" in userData)
    userData.birthDate = userData.birthDate
      ? new Date(userData.birthDate)
      : null;
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "STUDENT" },
    include: { studentProfile: true },
  });
  if (!existing) throw new AppError(404, "Aluno não encontrado.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: existing.id }, data: userData });
    await tx.studentProfile.update({
      where: { id: existing.studentProfile.id },
      data: {
        ...(objective !== undefined && { objective }),
        ...(notes !== undefined && { notes }),
        ...(initialHeightCm !== undefined && { initialHeightCm }),
        ...(accessStatus !== undefined && { accessStatus }),
        ...(accessExpiresAt !== undefined && {
          accessExpiresAt: accessExpiresAt ? new Date(accessExpiresAt) : null,
        }),
        ...(gatewayCustomerId !== undefined && { gatewayCustomerId }),
      },
    });
    if (partnerId !== undefined) {
      const currentReferral = await tx.referral.findUnique({
        where: { studentId: existing.studentProfile.id },
      });
      if (
        currentReferral?.status === "APPROVED" &&
        currentReferral.partnerId !== partnerId
      )
        throw new AppError(
          422,
          "A indicação já foi aprovada e não pode ser trocada.",
        );
      const partner = partnerId
        ? await tx.partnerProfile.findFirst({ where: { id: partnerId, active: true } })
        : null;
      if (partnerId && !partner)
        throw new AppError(422, "Parceiro de indicação não encontrado ou inativo.");
      await tx.referral.deleteMany({ where: { studentId: existing.studentProfile.id, status: "PENDING" } });
      if (partner) {
        await tx.referral.create({
          data: {
            partnerId: partner.id,
            studentId: existing.studentProfile.id,
            creditCents: partner.defaultCreditCents,
          },
        });
      }
    }
    if (accessStatus === "ACTIVE")
      await activateReferralCredit(tx, existing.studentProfile.id);
    if (programIds) {
      await tx.studentProgram.deleteMany({
        where: {
          studentId: existing.studentProfile.id,
          programId: { notIn: programIds },
        },
      });
      await Promise.all(
        programIds.map((programId) =>
          tx.studentProgram.upsert({
            where: {
              studentId_programId: {
                studentId: existing.studentProfile.id,
                programId,
              },
            },
            update: { status: "ACTIVE" },
            create: { studentId: existing.studentProfile.id, programId },
          }),
        ),
      );
    }
  });
  return getStudent(req, res);
};

export const changeStudentPassword = async (req, res) => {
  const student = await prisma.user.findFirst({
    where: { id: req.params.id, role: "STUDENT" },
    select: { id: true },
  });
  if (!student) throw new AppError(404, "Aluno não encontrado.");

  const changedAt = new Date();
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.id },
      data: { passwordHash, passwordChangedAt: changedAt },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: student.id, revokedAt: null },
      data: { revokedAt: changedAt },
    }),
  ]);

  res.json({ message: "Senha alterada. As sessões da aluna foram encerradas." });
};

export const deleteStudent = async (req, res) => {
  const student = await prisma.user.findFirst({
    where: { id: req.params.id, role: "STUDENT" },
    select: {
      id: true,
      studentProfile: {
        select: { partnerProfile: { select: { id: true } } },
      },
    },
  });
  if (!student) throw new AppError(404, "Aluno não encontrado.");

  await prisma.$transaction(async (tx) => {
    const partnerId = student.studentProfile?.partnerProfile?.id;
    if (partnerId) {
      // Referral.partner usa Restrict; removemos as indicações antes do perfil.
      await tx.referral.deleteMany({ where: { partnerId } });
    }
    await tx.user.delete({ where: { id: student.id } });
  });

  res.status(204).send();
};

export const addStudentMeasurement = async (req, res) => {
  const student = await prisma.studentProfile.findFirst({
    where: { userId: req.params.id, user: { role: "STUDENT" } },
  });
  if (!student) throw new AppError(404, "Aluno não encontrado.");
  res
    .status(201)
    .json(await createMeasurement(student.id, req.user.id, req.body));
};

export const listPrograms = async (req, res) => {
  const programs = await prisma.program.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { sortOrder: "asc" },
      include: {
        modules: {
          where: { status: { not: "ARCHIVED" } },
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              where: { status: { not: "ARCHIVED" } },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });
  const baseUrl = requestBaseUrl(req);
  res.json(
    programs.map((program) => {
      const serialized = contentAssets(program, baseUrl);
      return {
        ...serialized,
        lessons: serialized.modules.flatMap((module) =>
          module.lessons.map((lesson) => ({
            ...lesson,
            moduleId: module.id,
            moduleTitle: module.title,
            programId: program.id,
          })),
        ),
      };
    }),
  );
};

export const createProgram = async (req, res) => {
  const input = contentAssetInput(req.body, requestBaseUrl(req));
  const data = {
    ...input,
    type: input.type || "TRAINING",
    coverUrl: input.coverUrl || "/brand/triade-fit-home.png",
    sortOrder: req.body.sortOrder ?? (await nextOrder("program")),
  };
  const program = await prisma.$transaction(async (tx) => {
    const created = await tx.program.create({ data });
    if (created.type === "TRAINING") await ensureTrainingModule(tx, created.id);
    if (created.status === "PUBLISHED")
      await assignPublishedProgramToAllStudents(tx, created.id);
    return created;
  });
  res.status(201).json(program);
};
export const updateProgram = async (req, res) => {
  const data = contentAssetInput(req.body, requestBaseUrl(req));
  const program = await prisma.$transaction(async (tx) => {
    const updated = await tx.program.update({
      where: { id: req.params.id },
      data,
    });
    if (updated.status === "PUBLISHED")
      await assignPublishedProgramToAllStudents(tx, updated.id);
    return updated;
  });
  res.json(program);
};
export const archiveProgram = async (req, res) =>
  res.json(
    await prisma.program.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    }),
  );
export const createModule = async (req, res) => {
  const input = contentAssetInput(req.body, requestBaseUrl(req));
  const module = await prisma.$transaction(async (tx) => {
    const program = input.programId
      ? await tx.program.findUnique({ where: { id: input.programId } })
      : await ensureContentProgram(tx);
    if (!program) throw new AppError(404, "Programa não encontrado.");
    if (program.type !== "CONTENT")
      throw new AppError(422, "Módulos visíveis pertencem somente ao conteúdo da Home.");
    const sortOrder =
      req.body.sortOrder ??
      (await nextOrder("module", { programId: program.id }, tx));
    return tx.module.create({
      data: {
        ...input,
        programId: program.id,
        coverUrl:
          input.coverUrl ||
          (sortOrder % 2 === 0
            ? "/brand/triade-fit-focus.png"
            : "/brand/triade-fit-balance.png"),
        sortOrder,
      },
    });
  });
  res.status(201).json(module);
};
export const updateModule = async (req, res) =>
  res.json(
    await prisma.module.update({
      where: { id: req.params.id },
      data: contentAssetInput(req.body, requestBaseUrl(req)),
    }),
  );
export const archiveModule = async (req, res) =>
  res.json(
    await prisma.module.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    }),
  );
export const createLesson = async (req, res) => {
  const input = contentAssetInput(req.body, requestBaseUrl(req));
  const lesson = await prisma.$transaction(async (tx) => {
    const { programId, ...lessonInput } = input;
    let moduleId = lessonInput.moduleId;
    if (programId) {
      const program = await tx.program.findUnique({ where: { id: programId } });
      if (!program || program.type !== "TRAINING")
        throw new AppError(422, "Escolha um programa de treino válido.");
      moduleId = (await ensureTrainingModule(tx, program.id)).id;
    }
    if (!moduleId) throw new AppError(422, "Escolha onde esta aula será publicada.");
    await validateIntroductoryLesson(tx, {
      moduleId,
      isIntroductory: lessonInput.isIntroductory,
    });
    const sortOrder =
      req.body.sortOrder ??
      (await nextOrder("lesson", { moduleId }, tx));
    return tx.lesson.create({
      data: {
        ...lessonInput,
        moduleId,
        coverUrl:
          lessonInput.coverUrl ||
          (lessonInput.kind === "MEDITATION"
            ? "/brand/triade-fit-balance.png"
            : "/brand/triade-fit-focus.png"),
        sortOrder,
      },
    });
  });
  res.status(201).json(lesson);
};
export const updateLesson = async (req, res) => {
  const input = contentAssetInput(req.body, requestBaseUrl(req));
  const lesson = await prisma.$transaction(async (tx) => {
    const { programId, ...lessonInput } = input;
    let moduleId = lessonInput.moduleId;
    if (programId) {
      const program = await tx.program.findUnique({ where: { id: programId } });
      if (!program || program.type !== "TRAINING")
        throw new AppError(422, "Escolha um programa de treino válido.");
      moduleId = (await ensureTrainingModule(tx, program.id)).id;
    }
    const current = await tx.lesson.findUnique({ where: { id: req.params.id } });
    if (!current) throw new AppError(404, "Aula não encontrada.");
    moduleId ||= current.moduleId;
    await validateIntroductoryLesson(tx, {
      moduleId,
      isIntroductory: lessonInput.isIntroductory,
    });
    return tx.lesson.update({
      where: { id: current.id },
      data: { ...lessonInput, moduleId },
    });
  });
  res.json(lesson);
};
export const archiveLesson = async (req, res) =>
  res.json(
    await prisma.lesson.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    }),
  );

export const listAnnouncements = async (_req, res) =>
  res.json(
    await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { recipients: true } } },
    }),
  );
export const createAnnouncement = async (req, res) => {
  const { studentIds, ...data } = req.body;
  const publishedAt = data.status === "PUBLISHED" ? new Date() : null;
  const announcement = await prisma.$transaction(async (tx) => {
    const created = await tx.announcement.create({
      data: {
        ...data,
        publishedAt,
        createdById: req.user.id,
        recipients: {
          create:
            data.audience === "SPECIFIC_STUDENTS"
              ? studentIds.map((studentId) => ({ studentId }))
              : [],
        },
      },
    });
    if (data.status === "PUBLISHED") {
      const users = await tx.user.findMany({
        where: {
          role: "STUDENT",
          status: "ACTIVE",
          ...(data.audience === "SPECIFIC_STUDENTS"
            ? { studentProfile: { id: { in: studentIds } } }
            : {}),
        },
        select: { id: true },
      });
      await tx.notification.createMany({
        data: users.map((user) => ({
          userId: user.id,
          announcementId: created.id,
          title: created.title,
          message: created.message,
        })),
      });
    }
    return created;
  });
  res.status(201).json(announcement);
};
export const updateAnnouncement = async (req, res) => {
  const { studentIds, ...data } = req.body;
  const current = await prisma.announcement.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  const firstPublish =
    current.status !== "PUBLISHED" && data.status === "PUBLISHED";
  const announcement = await prisma.$transaction(async (tx) => {
    await tx.announcementRecipient.deleteMany({
      where: { announcementId: current.id },
    });
    const updated = await tx.announcement.update({
      where: { id: current.id },
      data: {
        ...data,
        ...(firstPublish && { publishedAt: new Date() }),
        recipients: {
          create:
            data.audience === "SPECIFIC_STUDENTS"
              ? studentIds.map((studentId) => ({ studentId }))
              : [],
        },
      },
    });
    if (firstPublish) {
      const users = await tx.user.findMany({
        where: {
          role: "STUDENT",
          status: "ACTIVE",
          ...(data.audience === "SPECIFIC_STUDENTS"
            ? { studentProfile: { id: { in: studentIds } } }
            : {}),
        },
        select: { id: true },
      });
      await tx.notification.createMany({
        data: users.map((user) => ({
          userId: user.id,
          announcementId: updated.id,
          title: updated.title,
          message: updated.message,
        })),
      });
    }
    return updated;
  });
  res.json(announcement);
};

export const listCommunityPosts = async (_req, res) =>
  res.json(
    await prisma.communityPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { likes: true, comments: true } } },
    }),
  );

const communityCommentInclude = {
  user: { select: { id: true, name: true, avatarUrl: true, role: true } },
  parent: {
    select: {
      id: true,
      user: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  },
};

const serializeAdminCommunityComment = ({ user, parent, userId: _userId, ...comment }, adminId) => ({
  ...comment,
  author: user,
  replyTo: parent ? { id: parent.id, author: parent.user } : null,
  isMine: user.id === adminId,
});

const findAdminCommunityPost = async (id) => {
  const post = await prisma.communityPost.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!post) throw new AppError(404, "Publicação não encontrada.");
  return post;
};

export const listCommunityPostComments = async (req, res) => {
  await findAdminCommunityPost(req.params.id);
  const comments = await prisma.communityPostComment.findMany({
    where: { postId: req.params.id },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: communityCommentInclude,
  });
  res.json(comments.map((comment) => serializeAdminCommunityComment(comment, req.user.id)));
};

export const listCommunityPostLikes = async (req, res) => {
  await findAdminCommunityPost(req.params.id);
  const likes = await prisma.communityPostLike.findMany({
    where: { postId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      },
    },
  });
  res.json(likes.map(({ user, ...like }) => ({ ...like, user })));
};

export const createCommunityPostComment = async (req, res) => {
  const post = await findAdminCommunityPost(req.params.id);
  if (post.status !== "PUBLISHED")
    throw new AppError(422, "Publique a postagem antes de responder comentários.");

  if (req.body.parentId) {
    const parent = await prisma.communityPostComment.findFirst({
      where: { id: req.body.parentId, postId: post.id },
      select: { id: true },
    });
    if (!parent)
      throw new AppError(422, "O comentário que você tentou responder não está mais disponível.");
  }

  const comment = await prisma.communityPostComment.create({
    data: {
      postId: post.id,
      userId: req.user.id,
      parentId: req.body.parentId || null,
      message: req.body.message,
    },
    include: communityCommentInclude,
  });
  const commentsCount = await prisma.communityPostComment.count({
    where: { postId: post.id },
  });
  res.status(201).json({
    comment: serializeAdminCommunityComment(comment, req.user.id),
    commentsCount,
  });
};

export const createCommunityPost = async (req, res) => {
  const post = await prisma.communityPost.create({
    data: {
      ...req.body,
      createdById: req.user.id,
      publishedAt: req.body.status === "PUBLISHED" ? new Date() : null,
    },
  });
  res.status(201).json(post);
};

export const updateCommunityPost = async (req, res) => {
  const current = await prisma.communityPost.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  res.json(
    await prisma.communityPost.update({
      where: { id: current.id },
      data: {
        ...req.body,
        ...(current.status !== "PUBLISHED" &&
          req.body.status === "PUBLISHED" && { publishedAt: new Date() }),
      },
    }),
  );
};
