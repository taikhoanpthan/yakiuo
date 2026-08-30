import { Button, Popconfirm, Space, Table, Tag, Tooltip } from "antd";

import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";

import dayjs from "dayjs";

const FeedbackTable = ({
  feedbacks = [],
  loading = false,
  pagination,
  deletingId,
  onPaginationChange,
  onEdit,
  onView,
  onDelete,
  onUserClick,
}) => {
  const columns = [
    // =========================
    // STT
    // =========================
    {
      title: "STT",
      key: "stt",
      width: 70,
      align: "center",

      render: (_, __, index) => {
        return (
          (pagination?.current - 1) * (pagination?.pageSize || 10) + index + 1
        );
      },
    },

    // =========================
    // KHÁCH HÀNG
    // =========================
    {
      title: "Khách hàng",
      key: "customer",
      width: 210,

      render: (_, record) => (
        <div>
          <div className="font-medium text-slate-800">
            {record.customerName || "Khách vãng lai"}
          </div>

          {record.customerPhone && (
            <div className="text-xs text-slate-400 mt-1">
              {record.customerPhone}
            </div>
          )}
        </div>
      ),
    },

    // =========================
    // BÀN
    // =========================
    {
      title: "Bàn",
      dataIndex: "tableNumber",
      key: "tableNumber",
      width: 90,
      align: "center",

      render: (value) => (
        <span className="font-medium text-slate-700">{value || "—"}</span>
      ),
    },

    // =========================
    // MEAL
    // =========================
    {
      title: "Meal",
      dataIndex: "meal",
      key: "meal",
      width: 130,

      render: (value) =>
        value ? (
          <Tag color="blue">{value}</Tag>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },

    // =========================
    // NỘI DUNG
    // =========================
    {
      title: "Nội dung",
      dataIndex: "content",
      key: "content",
      width: 250,

      render: (value) => {
        if (!value) {
          return <span className="text-slate-400">—</span>;
        }

        return (
          <Tooltip title={value}>
            <div className="w-[220px] truncate text-slate-600">{value}</div>
          </Tooltip>
        );
      },
    },

    // =========================
    // NGƯỜI TẠO
    // =========================
    {
      title: "Người tạo",
      key: "createdBy",
      width: 220,

      render: (_, record) => {
        const user = record.createdBy;

        if (!user) {
          return <span className="text-slate-400">—</span>;
        }

        const name = user.fullName || user.username || "—";

        return (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={name}
                className={`w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 ${
                  onUserClick && user._id ? "cursor-pointer" : ""
                }`}
                onClick={() => onUserClick?.(user)}
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center font-semibold text-sm shrink-0 ${
                  onUserClick && user._id ? "cursor-pointer" : ""
                }`}
                onClick={() => onUserClick?.(user)}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Tên + role */}
            <div className="min-w-0">
              <div className="font-medium text-slate-700 truncate">{name}</div>

              {user.role && (
                <div className="text-xs text-slate-400 mt-1 capitalize">
                  {user.role}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    // =========================
    // NGÀY
    // =========================
    {
      title: "Ngày",
      key: "date",
      width: 210,

      render: (_, record) => (
        <div className="text-xs">
          {/* NGÀY FEEDBACK */}
          <div className="font-medium text-slate-700">
            <span className="text-slate-400 mr-1">Feedback:</span>

            {record.dateTime && dayjs(record.dateTime).isValid()
              ? dayjs(record.dateTime).format("DD/MM/YYYY")
              : "—"}
          </div>

          {/* NGÀY TẠO
          <div className="text-slate-400 mt-1">
            <span className="mr-1">Tạo:</span>

            {record.createdAt && dayjs(record.createdAt).isValid()
              ? dayjs(record.createdAt).format("DD/MM/YYYY HH:mm")
              : "—"}
          </div> */}

          {/* NGÀY CẬP NHẬT */}
          {record.updatedAt &&
            dayjs(record.updatedAt).isValid() &&
            record.updatedAt !== record.createdAt && (
              <div className="text-slate-400 mt-1">
                <span className="mr-1">Cập nhật:</span>

                {dayjs(record.updatedAt).format("DD/MM/YYYY HH:mm")}
              </div>
            )}
        </div>
      ),
    },

    // =========================
    // THAO TÁC
    // =========================
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      align: "center",

      render: (_, record) => (
        <Space size="small">
          {/* XEM */}
          {onView && (
            <Tooltip title="Xem">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => onView(record)}
              />
            </Tooltip>
          )}

          {/* SỬA */}
          {onEdit && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}

          {/* XÓA */}
          {onDelete && (
            <Popconfirm
              title="Xóa feedback?"
              description="Bạn có chắc muốn xóa feedback này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() => onDelete(record._id)}
            >
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                loading={deletingId === record._id}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const columnOrder = [
    "stt",
    "date",
    "createdBy",
    "content",
    "customer",
    "tableNumber",
    "meal",
    "actions",
  ];

  const orderedColumns = columnOrder
    .map((key) => columns.find((column) => column.key === key))
    .filter(Boolean);

  return (
    <div className="w-full overflow-hidden">
      <Table
        rowKey="_id"
        loading={loading}
        dataSource={feedbacks}
        columns={orderedColumns}
        scroll={{
          x: 1250,
        }}
        pagination={{
          current: pagination?.current || 1,

          pageSize: pagination?.pageSize || 10,

          total: pagination?.total || 0,

          showSizeChanger: false,

          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,

          onChange: onPaginationChange,
        }}
        locale={{
          emptyText: "Chưa có phản hồi nào",
        }}
      />
    </div>
  );
};

export default FeedbackTable;
