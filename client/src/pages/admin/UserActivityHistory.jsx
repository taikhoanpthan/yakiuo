import { useEffect, useState } from "react";
import { Button, Card, Image, Popconfirm, Select, Table, Tag, message } from "antd";
import UserAvatar from "../../components/common/UserAvatar";
import { DeleteOutlined, LockOutlined, LoginOutlined, PictureOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { deleteAllUserActivities, deleteUserActivity, getUserActivities } from "../../services/user.service";

const activityConfig = {
  login: { label: "Đăng nhập", color: "blue", icon: <LoginOutlined /> },
  password_changed: { label: "Đổi mật khẩu", color: "gold", icon: <LockOutlined /> },
  avatar_changed: { label: "Đổi avatar", color: "purple", icon: <PictureOutlined /> },
  cover_changed: { label: "Đổi ảnh bìa", color: "cyan", icon: <PictureOutlined /> },
};

const getDevice = (userAgent = "") => {
  if (!userAgent) return "Không rõ thiết bị";
  const browser = /Edg\//.test(userAgent) ? "Microsoft Edge" : /Chrome\//.test(userAgent) ? "Google Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Trình duyệt khác";
  const device = /iPhone/.test(userAgent) ? "iPhone" : /iPad/.test(userAgent) ? "iPad" : /Android/.test(userAgent) ? "Điện thoại Android" : /Windows/.test(userAgent) ? "Máy tính Windows" : /Mac OS/.test(userAgent) ? "Máy tính Mac" : "Thiết bị khác";
  return `${device} · ${browser}`;
};

const UserActivityHistory = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState();

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await getUserActivities({ limit: 100, type });
      setActivities(response?.data?.activities || []);
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể tải lịch sử hoạt động");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadActivities(); }, [type]);

  const handleDelete = async (id) => {
    try {
      await deleteUserActivity(id);
      setActivities((items) => items.filter((item) => item._id !== id));
      message.success("Đã xóa lịch sử hoạt động");
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể xóa lịch sử");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await deleteAllUserActivities();
      setActivities([]);
      message.success(`Đã xóa ${response?.data?.deletedCount || 0} mục lịch sử`);
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể xóa toàn bộ lịch sử");
    }
  };

  const columns = [
    {
      title: "Người dùng", key: "user", width: 260,
      render: (_, record) => record.user ? (
        <div className="flex items-center gap-3">
          <UserAvatar user={record.user}>{record.user.fullName?.charAt(0)?.toUpperCase()}</UserAvatar>
          <div><div className="font-medium text-slate-800">{record.user.fullName}</div><div className="text-xs text-slate-500">@{record.user.username}</div></div>
        </div>
      ) : <span className="text-slate-400">Tài khoản đã bị xóa</span>,
    },
    {
      title: "Hoạt động", dataIndex: "type", width: 170,
      render: (value) => {
        const config = activityConfig[value] || { label: value, color: "default" };
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      },
    },

    {
      title: "Thiết bị", dataIndex: "userAgent", width: 220,
      render: (value, record) => <div className="text-sm text-slate-600"><div>{getDevice(value)}</div>{record.ipAddress && <div className="mt-0.5 text-xs text-slate-400">IP: {record.ipAddress}</div>}</div>,
    },
    { title: "Thời gian", dataIndex: "createdAt", width: 180, render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm:ss") },
    {
      title: "", key: "actions", width: 68, align: "center",
      render: (_, record) => (
        <Popconfirm title="Xóa mục lịch sử này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record._id)}>
          <Button danger type="text" icon={<DeleteOutlined />} aria-label="Xóa lịch sử" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="erp-page-header">
        <div><div className="erp-page-eyebrow">Quản trị hệ thống</div><h1 className="erp-page-title">Lịch sử người dùng</h1><p className="erp-page-description">Theo dõi đăng nhập, thiết bị và các thay đổi bảo mật, avatar, ảnh bìa.</p></div>
        <Popconfirm title="Xóa toàn bộ lịch sử?" description="Thao tác này không thể hoàn tác." okText="Xóa toàn bộ" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={handleDeleteAll}>
          <Button danger icon={<DeleteOutlined />}>Xóa toàn bộ</Button>
        </Popconfirm>
      </div>
      <Card className="erp-section-card erp-filter-card mb-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select allowClear placeholder="Tất cả hoạt động" value={type} onChange={setType} className="w-full sm:w-64" options={Object.entries(activityConfig).map(([value, config]) => ({ value, label: config.label }))} />
          <Button icon={<ReloadOutlined />} onClick={loadActivities} loading={loading}>Làm mới</Button>
        </div>
      </Card>
      <Card className="erp-section-card erp-table-card" styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={activities} loading={loading} scroll={{ x: 1050 }} pagination={{ pageSize: 10, showSizeChanger: false }} />
      </Card>
    </div>
  );
};

export default UserActivityHistory;
