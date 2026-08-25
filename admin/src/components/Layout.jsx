import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Users,
  X,
} from "lucide-react";
import Brand from "./Brand.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const links = [
  ["/dashboard", LayoutDashboard, "Dashboard"],
  ["/alunos", Users, "Alunos"],
  ["/programas", BookOpen, "Programas e aulas"],
  ["/parceiros", Handshake, "Parceiros e saldo"],
  ["/avisos", MessageCircle, "Comunidade"],
  ["/configuracoes", Settings, "Configurações"],
];
export default function Layout() {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const title =
    links.find(([path]) => location.pathname.startsWith(path))?.[2] ||
    "Triade FIT";
  return (
    <div className={`admin-shell ${compact ? "is-compact" : ""}`}>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar__top">
          <Brand compact={compact} />
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X />
          </button>
        </div>
        <nav>
          {links.map(([path, Icon, label]) => (
            <NavLink key={path} to={path} onClick={() => setOpen(false)}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="admin-profile">
            <span>{user.name.charAt(0)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>Personal Trainer</small>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut />
            <span>Sair</span>
          </button>
        </div>
        <button
          className="collapse-button"
          onClick={() => setCompact(!compact)}
          aria-label="Recolher menu"
        >
          <ChevronLeft />
        </button>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <section className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <small>PAINEL ADMINISTRATIVO</small>
            <h1>{title}</h1>
          </div>
          <button className="icon-button notification-button">
            <Bell />
            <i />
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </section>
    </div>
  );
}
