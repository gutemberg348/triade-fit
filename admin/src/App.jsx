import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import { Loading } from "./components/UI.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Students = lazy(() => import("./pages/Students.jsx"));
const StudentDetail = lazy(() => import("./pages/StudentDetail.jsx"));
const Programs = lazy(() => import("./pages/Programs.jsx"));
const Partners = lazy(() => import("./pages/Partners.jsx"));
const Announcements = lazy(() => import("./pages/Announcements.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));

function Protected() {
  const { user, booting } = useAuth();
  if (booting) return <Loading label="Validando sessão..." />;
  return user?.role === "ADMIN" ? <Layout /> : <Navigate to="/login" replace />;
}
export default function App() {
  return (
    <Suspense fallback={<Loading label="Preparando a página..." />}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alunos" element={<Students />} />
        <Route path="/alunos/:id" element={<StudentDetail />} />
        <Route path="/programas" element={<Programs />} />
        <Route path="/parceiros" element={<Partners />} />
        <Route path="/avisos" element={<Announcements />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
