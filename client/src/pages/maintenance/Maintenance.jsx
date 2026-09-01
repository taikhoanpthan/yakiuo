import { useEffect, useState } from "react";
import api from "../../services/api";

export default function Maintenance() {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const check = async () => {
      if (document.hidden) return;

      try {
        const response = await api.get("/system/status");
        setActive(Boolean(response.data?.data?.maintenanceMode));
      } catch {}
    };

    check();
    const timer = window.setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!active) window.location.replace("/login");
  return <main className="maintenance-page">
    <div className="maintenance-orb maintenance-orb-one" />
    <div className="maintenance-orb maintenance-orb-two" />
    <section className="maintenance-card">
      <div className="maintenance-brand"><i /> YAKIUO <span>ERP</span></div>
      <div className="maintenance-illustration" aria-hidden="true"><div className="maintenance-halo" /><div className="maintenance-tool">⚙</div><b>✦</b><em>✦</em></div>
      <div className="maintenance-status"><span /> Đang nâng cấp hệ thống</div>
      <h1>Chúng tôi sẽ trở lại<br /><strong>trong ít phút nữa.</strong></h1>
      <p>Yakiuo ERP đang được bảo trì để mọi trải nghiệm của bạn vận hành mượt mà và an toàn hơn.</p>
      <div className="maintenance-progress"><div><span>Tiến trình cập nhật</span><b>Đang thực hiện</b></div><i><small /></i></div>
      <footer><span className="maintenance-live-dot" /> Trang này tự động cập nhật khi hệ thống hoạt động lại</footer>
    </section>
  </main>;
}
