import { Tooltip } from "antd";
import { LogoutOutlined, SettingOutlined } from "@ant-design/icons";

const DesktopSidebar = ({ collapsed, items, pathname, onNavigate, onLogout }) => (
  <div className="erp-sidebar-content">
    <div className="erp-brand">
      <div className="erp-brand-mark">Y</div>
      {!collapsed && <div><strong>YAKIUO</strong><span>ERP WORKSPACE</span></div>}
    </div>

    {!collapsed && <div className="erp-nav-label">Điều hướng</div>}

    <nav className="erp-nav" aria-label="Điều hướng chính">
      {items.map((item) => {
        const active = pathname === item.key || pathname.startsWith(`${item.key}/`);
        return (
          <Tooltip key={item.key} title={collapsed ? item.label : undefined} placement="right">
            <button
              type="button"
              className={`erp-nav-item ${active ? "is-active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="erp-nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          </Tooltip>
        );
      })}
    </nav>

    <div className="erp-side-bottom">
      <div className="erp-side-help"><SettingOutlined />{!collapsed && <span>Hệ thống nội bộ</span>}</div>
      <Tooltip title={collapsed ? "Đăng xuất" : undefined} placement="right">
        <button type="button" className="erp-logout" onClick={onLogout}>
          <LogoutOutlined />{!collapsed && <span>Đăng xuất</span>}
        </button>
      </Tooltip>
    </div>
  </div>
);

export default DesktopSidebar;
