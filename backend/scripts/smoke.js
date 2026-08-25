const baseUrl = process.env.API_URL || "http://localhost:3333/api";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const body = response.status === 204 ? null : await response.json();
  return { status: response.status, body };
}

const admin = await request("/auth/admin/login", {
  method: "POST",
  body: JSON.stringify({
    email: "personal@essenza.com",
    password: "Essenza@2026",
  }),
});
const student = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "aluna@essenza.com",
    password: "Essenza@2026",
  }),
});
const dashboard = await request("/admin/dashboard", {
  headers: { authorization: `Bearer ${admin.body.accessToken}` },
});
const programs = await request("/programs", {
  headers: { authorization: `Bearer ${student.body.accessToken}` },
});
const evolution = await request("/measurements/evolution", {
  headers: { authorization: `Bearer ${student.body.accessToken}` },
});
const forbidden = await request("/admin/dashboard", {
  headers: { authorization: `Bearer ${student.body.accessToken}` },
});

const result = {
  adminLogin: admin.status,
  studentLogin: student.status,
  dashboard: dashboard.status,
  totalStudents: dashboard.body?.metrics?.totalStudents,
  programs: programs.body?.length,
  measurements: evolution.body?.measurements?.length,
  studentOnAdminRoute: forbidden.status,
};
console.log(JSON.stringify(result, null, 2));
if (
  admin.status !== 200 ||
  student.status !== 200 ||
  dashboard.status !== 200 ||
  programs.status !== 200 ||
  evolution.status !== 200 ||
  forbidden.status !== 403
)
  process.exit(1);
