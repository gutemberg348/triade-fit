export const requestBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const portableApiAsset = (url) =>
  (url.pathname.startsWith("/brand/") || url.pathname.startsWith("/uploads/")) &&
  (url.port === "3333" || url.hostname === "localhost");

export const absolutePublicUrl = (value, baseUrl) => {
  if (!value || typeof value !== "string") return value;
  if (value.startsWith("/")) return new URL(value, `${baseUrl}/`).toString();
  try {
    const url = new URL(value);
    if (portableApiAsset(url))
      return new URL(`${url.pathname}${url.search}`, `${baseUrl}/`).toString();
  } catch {
    return value;
  }
  return value;
};

export const relativePublicUrl = (value, baseUrl) => {
  if (!value || typeof value !== "string") return value;
  try {
    const url = new URL(value, `${baseUrl}/`);
    const base = new URL(baseUrl);
    if (
      (url.origin === base.origin || portableApiAsset(url)) &&
      (url.pathname.startsWith("/brand/") || url.pathname.startsWith("/uploads/"))
    )
      return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
  return value;
};

export const contentAssetInput = (content, baseUrl) => ({
  ...content,
  coverUrl: relativePublicUrl(content.coverUrl, baseUrl),
  videoUrl: relativePublicUrl(content.videoUrl, baseUrl),
  materials: Array.isArray(content.materials)
    ? content.materials.map((material) => ({
        ...material,
        url: relativePublicUrl(material.url, baseUrl),
      }))
    : content.materials,
});

const lessonAssets = (lesson, baseUrl) => ({
  ...lesson,
  coverUrl: absolutePublicUrl(lesson.coverUrl, baseUrl),
  videoUrl: absolutePublicUrl(lesson.videoUrl, baseUrl),
  materials: Array.isArray(lesson.materials)
    ? lesson.materials.map((material) => ({
        ...material,
        url: absolutePublicUrl(material.url, baseUrl),
      }))
    : lesson.materials,
});

export const contentAssets = (content, baseUrl) => ({
  ...content,
  coverUrl: absolutePublicUrl(content.coverUrl, baseUrl),
  lessons: content.lessons?.map((lesson) => lessonAssets(lesson, baseUrl)),
  modules: content.modules?.map((module) => ({
    ...module,
    coverUrl: absolutePublicUrl(module.coverUrl, baseUrl),
    lessons: module.lessons?.map((lesson) => lessonAssets(lesson, baseUrl)),
  })),
});

export const singleLessonAssets = lessonAssets;
