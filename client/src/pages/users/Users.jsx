import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";

import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Popconfirm } from "antd";
import dayjs from "dayjs";

import UserModal from "./UserModal";
import {
  getUsers,
  updateUserStatus,
  deleteUser,
} from "../../services/user.service";
import EmployeeDetail from "./EmployeeDetail";
import { useAuth } from "../../store/AuthContext";

const Users = () => {
  const { user: currentUser } = useAuth();
  const canManageUsers = currentUser?.role === "admin";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(undefined);
  const [status, setStatus] = useState(undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await getUsers({
        page: 1,
        limit: 100,
        search,
        role,
        status,
      });

      setUsers(response.data.users || []);
    } catch (error) {
      console.error(error);

      message.error(
        error.response?.data?.message || "Không thể tải danh sách nhân viên",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [role, status]);

  const handleSearch = () => {
    fetchUsers();
  };

  const handleToggleStatus = async (record) => {
    try {
      const newStatus = record.status === "active" ? "inactive" : "active";

      await updateUserStatus(record._id, newStatus);

      message.success(
        newStatus === "active" ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
      );

      await fetchUsers();
    } catch (error) {
      console.error("Update user status failed:", error);

      message.error(
        error.response?.data?.message || "Không thể thay đổi trạng thái",
      );
    }
  };
  const handleDeleteUser = async (record) => {
    try {
      await deleteUser(record._id);

      message.success(`Đã xóa tài khoản ${record.username}`);

      await fetchUsers();
    } catch (error) {
      console.error("Delete user failed:", error);

      message.error(error.response?.data?.message || "Không thể xóa tài khoản");
    }
  };
  const columns = [
    {
      title: "STT",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1,
    },

    {
      title: "Nhân viên",
      key: "employee",
      width: 260,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={44}
            src={record.avatar || undefined}
            className="shrink-0 cursor-pointer"
            onClick={() => setSelectedEmployee(record)}
          >
            {record.fullName?.charAt(0)?.toUpperCase()}
          </Avatar>

          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">
              {record.fullName}
            </div>

            <div className="text-xs text-slate-500">@{record.username}</div>
          </div>
        </div>
      ),
    },

    {
      title: "Email",
      dataIndex: "email",
      width: 220,
      render: (value) =>
        value || <span className="text-slate-400">Chưa có</span>,
    },

    {
      title: "Số điện thoại",
      dataIndex: "phone",
      width: 160,
      render: (value) =>
        value || <span className="text-slate-400">Chưa có</span>,
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      width: 130,
      align: "center",
      render: (value) => {
        const config = {
          admin: {
            color: "red",
            label: "ADMIN",
          },
          manager: {
            color: "gold",
            label: "MANAGER",
          },
          premium: {
            color: "purple",
            label: "PREMIUM",
          },
          employee: {
            color: "blue",
            label: "EMPLOYEE",
          },
        };

        const item = config[value] || {
          color: "default",
          label: value?.toUpperCase(),
        };

        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 130,
      align: "center",
      render: (value) =>
        value === "active" ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Hoạt động
          </Tag>
        ) : (
          <Tag color="error" icon={<StopOutlined />}>
            Đã khóa
          </Tag>
        ),
    },

    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      width: 160,
      render: (value) => dayjs(value).format("DD/MM/YYYY"),
    },

    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      align: "center",
      render: (_, record) => (
        <Space>
          {/* CHỈNH SỬA */}
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              setModalOpen(true);
            }}
          />

          {/* KHÓA / MỞ KHÓA */}
          <Button
            danger={record.status === "active"}
            type={record.status === "active" ? "default" : "primary"}
            icon={
              record.status === "active" ? (
                <StopOutlined />
              ) : (
                <CheckCircleOutlined />
              )
            }
            onClick={() => handleToggleStatus(record)}
          />

          {/* XÓA */}
          <Popconfirm
            title="Xóa tài khoản?"
            description={`Bạn có chắc muốn xóa tài khoản "${record.username}"?`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() => handleDeleteUser(record)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Manager chỉ được xem hồ sơ nhân viên; các thao tác đổi thông tin/mật khẩu
  // vẫn dành riêng cho admin ở cả UI lẫn backend permission.
  if (!canManageUsers) {
    columns.pop();
  }
  if (selectedEmployee) {
    return (
      <EmployeeDetail
        user={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }
  return (
    <div>
      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">Quản trị nhân sự</div>
          <h1 className="erp-page-title">Nhân viên</h1>
          <p className="erp-page-description">
            Quản lý tài khoản, quyền hạn và trạng thái nhân sự.
          </p>
        </div>

        {canManageUsers && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => {
              setEditingUser(null);
              setModalOpen(true);
            }}
          >
            Thêm nhân viên
          </Button>
        )}
      </div>

      {/* FILTER */}
      <Card className="erp-section-card erp-filter-card mb-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <Input
            placeholder="Tìm username, họ tên, email..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />

          <Select
            placeholder="Vai trò"
            allowClear
            value={role}
            onChange={setRole}
            className="w-full lg:w-40"
            options={[
              {
                value: "admin",
                label: "Admin",
              },
              {
                value: "manager",
                label: "Manager",
              },
              {
                value: "premium",
                label: "Premium",
              },
              {
                value: "employee",
                label: "Employee",
              },
            ]}
          />

          <Select
            placeholder="Trạng thái"
            allowClear
            value={status}
            onChange={setStatus}
            className="w-full lg:w-40"
            options={[
              {
                value: "active",
                label: "Hoạt động",
              },
              {
                value: "inactive",
                label: "Đã khóa",
              },
            ]}
          />

          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
            Làm mới
          </Button>
        </div>
      </Card>

      {/* TABLE */}
      <Card
        className="erp-section-card erp-table-card"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={users}
          loading={loading}
          scroll={{
            x: 1300,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} nhân viên`,
          }}
        />
      </Card>

      {/* MODAL */}
      <UserModal
        open={modalOpen}
        editingUser={editingUser}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default Users;
