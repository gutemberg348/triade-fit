import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import contentRoutes from "./routes/content.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import appConfigRoutes from "./routes/app-config.routes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { AppError } from "./utils/AppError.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin))
        return callback(null, true);
      callback(new AppError(403, "Origem não autorizada pelo CORS."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  "/uploads",
  express.static("uploads", {
    fallthrough: false,
    maxAge: env.NODE_ENV === "production" ? "7d" : 0,
  }),
);
app.use(
  "/brand",
  express.static("public/brand", {
    fallthrough: false,
    maxAge: env.NODE_ENV === "production" ? "30d" : 0,
  }),
);
if (env.NODE_ENV !== "test") app.use(morgan("dev"));
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "essenza-api",
    timestamp: new Date().toISOString(),
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", contentRoutes);
app.use("/api", measurementRoutes);
app.use("/api", announcementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api", appConfigRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
