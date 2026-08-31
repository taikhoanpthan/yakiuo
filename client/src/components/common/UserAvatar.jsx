import { Avatar } from "antd";

const toNumber = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const getTransform = (position, zoom) => {
  const safeZoom = toNumber(zoom, 1, 1, 2.5);
  const x = toNumber(position?.x, 50, 0, 100);
  const y = toNumber(position?.y, 50, 0, 100);
  return `translate(${(50 - x) * (safeZoom - 1)}%, ${(50 - y) * (safeZoom - 1)}%) scale(${safeZoom})`;
};

// Renders the profile crop consistently in headers, tables, and feeds.
const UserAvatar = ({ user, src, avatarPosition, avatarZoom, alt = "", children, className, onClick, openDetail = true, ...avatarProps }) => {
  const imageSrc = src ?? user?.avatar;
  const position = avatarPosition ?? user?.avatarPosition;
  const zoom = avatarZoom ?? user?.avatarZoom;
  const userId = user?._id || user?.userId;

  const handleClick = (event) => {
    if (!openDetail || !userId) return;
    event.stopPropagation();
    if (onClick) {
      onClick(event);
      return;
    }
    window.dispatchEvent(new CustomEvent("user:open-detail", {
      detail: { ...user, _id: userId },
    }));
  };

  return (
    <Avatar
      {...avatarProps}
      alt={alt}
      className={`${className || ""} ${openDetail && userId ? "cursor-pointer" : ""}`.trim()}
      onClick={openDetail ? handleClick : onClick}
      src={imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${toNumber(position?.x, 50, 0, 100)}% ${toNumber(position?.y, 50, 0, 100)}%`,
            transformOrigin: "center",
            transform: getTransform(position, zoom),
          }}
        />
      ) : undefined}
    >
      {children}
    </Avatar>
  );
};

export default UserAvatar;
