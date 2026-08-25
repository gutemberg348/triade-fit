import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const list = async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { audience: "ALL" },
        { audience: "ACTIVE_STUDENTS" },
        {
          audience: "SPECIFIC_STUDENTS",
          recipients: { some: { studentId: req.user.studentId } },
        },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      message: true,
      imageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  res.json(announcements);
};

export const communityPosts = async (req, res) => {
  const posts = await prisma.communityPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        likes: {
          where: { userId: req.user.id },
          select: { id: true },
        },
        _count: { select: { likes: true } },
      },
    });
  res.json(
    posts.map(({ likes, _count, createdById, status, updatedAt, ...post }) => ({
      ...post,
      likesCount: _count.likes,
      likedByMe: likes.length > 0,
    })),
  );
};

const publishedPost = async (id) => {
  const post = await prisma.communityPost.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!post) throw new AppError(404, "Publicação não encontrada.");
  return post;
};

const likeResponse = async (postId, userId) => {
  const [count, like] = await Promise.all([
    prisma.communityPostLike.count({ where: { postId } }),
    prisma.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true },
    }),
  ]);
  return { likesCount: count, likedByMe: Boolean(like) };
};

export const likeCommunityPost = async (req, res) => {
  await publishedPost(req.params.id);
  await prisma.communityPostLike.upsert({
    where: {
      postId_userId: { postId: req.params.id, userId: req.user.id },
    },
    update: {},
    create: { postId: req.params.id, userId: req.user.id },
  });
  res.json(await likeResponse(req.params.id, req.user.id));
};

export const unlikeCommunityPost = async (req, res) => {
  await publishedPost(req.params.id);
  await prisma.communityPostLike.deleteMany({
    where: { postId: req.params.id, userId: req.user.id },
  });
  res.json(await likeResponse(req.params.id, req.user.id));
};

export const notifications = async (req, res) =>
  res.json(
    await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  );
export const readNotification = async (req, res) =>
  res.json(
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { readAt: new Date() },
    }),
  );
