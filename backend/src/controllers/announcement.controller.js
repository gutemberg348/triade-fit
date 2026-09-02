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
        _count: { select: { likes: true, comments: true } },
      },
    });
  res.json(
    posts.map(({ likes, _count, createdById, status, updatedAt, ...post }) => ({
      ...post,
      likesCount: _count.likes,
      commentsCount: _count.comments,
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

export const communityPostLikes = async (req, res) => {
  await publishedPost(req.params.id);
  const likes = await prisma.communityPostLike.findMany({
    where: { postId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  res.json(likes.map(({ user, ...like }) => ({ ...like, ...user })));
};

const serializeComment = ({ user, parent, userId: _userId, ...comment }, currentUserId) => ({
  ...comment,
  author: user,
  replyTo: parent ? { id: parent.id, author: parent.user } : null,
  isMine: user.id === currentUserId,
});

export const communityPostComments = async (req, res) => {
  await publishedPost(req.params.id);
  const comments = await prisma.communityPostComment.findMany({
    where: { postId: req.params.id },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      parent: {
        select: {
          id: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  res.json(comments.map((comment) => serializeComment(comment, req.user.id)));
};

export const createCommunityPostComment = async (req, res) => {
  await publishedPost(req.params.id);
  if (req.body.parentId) {
    const parent = await prisma.communityPostComment.findFirst({
      where: { id: req.body.parentId, postId: req.params.id },
      select: { id: true },
    });
    if (!parent) throw new AppError(422, "O comentário que você tentou responder não está mais disponível.");
  }

  const comment = await prisma.communityPostComment.create({
    data: {
      postId: req.params.id,
      userId: req.user.id,
      parentId: req.body.parentId || null,
      message: req.body.message,
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      parent: {
        select: {
          id: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  });
  const commentsCount = await prisma.communityPostComment.count({
    where: { postId: req.params.id },
  });
  res.status(201).json({
    comment: serializeComment(comment, req.user.id),
    commentsCount,
  });
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
