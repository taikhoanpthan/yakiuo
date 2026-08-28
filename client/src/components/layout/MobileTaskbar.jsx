import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const MobileTaskbar = ({ items, pathname, onNavigate }) => (
  <nav className="erp-mobile-taskbar" aria-label="Điều hướng mobile">
    {items.map((item) => {
      const active = pathname === item.key || pathname.startsWith(`${item.key}/`);
      const icon = item.key === "/profile" ? (
        <Avatar
          size={24}
          src={item.user?.avatar || undefined}
          icon={!item.user?.avatar && <UserOutlined />}
        >
          {!item.user?.avatar && (item.user?.fullName?.charAt(0) || "Y").toUpperCase()}
        </Avatar>
      ) : item.icon;

      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onNavigate(item.key)}
          className={`erp-mobile-task-item ${active ? "is-active" : ""}`}
        >
          {active && (
            <motion.span
              layoutId="mobile-nav-active"
              className="erp-mobile-task-active"
              transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.7 }}
            />
          )}
          <motion.span
            className="erp-mobile-task-icon"
            animate={{ scale: active ? 1.05 : 1, y: active ? -1 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.55 }}
          >
            {icon}
          </motion.span>
          <span className="erp-mobile-task-label">{item.shortLabel || item.label}</span>
        </button>
      );
    })}
  </nav>
);

export default MobileTaskbar;
