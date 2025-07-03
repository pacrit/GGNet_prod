// Sidebar.tsx
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="sidebar-fixed">
      <div className="drawer-header">
        <h2>Integrações</h2>
      </div>
      <div
        className="valorant-icon"
        style={{ cursor: "pointer" }}
        onClick={() => router.push("/valorant")}
      >
        <img src="/icon-val.png" alt="Valorant Icon" width={32} height={32} />
        <span className="val-tittle">Valorant</span>
      </div>
      <div
        className="valorant-icon"
        style={{ cursor: "pointer" }}
        onClick={() => router.push("/valorant")}
      >
        <img src="/icon-cs.png" alt="CS Icon" width={32} height={32} />
        <span className="val-tittle">Counter Strike</span>
      </div>
      <div
        className="valorant-icon"
        style={{ cursor: "pointer" }}
        onClick={() => router.push("/valorant")}
      >
        <img src="/icon-lol.png" alt="LOL icon" width={32} height={32} />
        <span className="val-tittle">League of Legends</span>
      </div>
    </aside>
  );
}