import { useEffect, useState } from "react";
import { Button, Card, Descriptions, Input, Modal, Popconfirm, Space, Table, Tag, Tooltip, message } from "antd";
import { CheckOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import UserAvatar from "../../components/common/UserAvatar";
import { deleteFeedback, getLateEntryFeedbacks, resolveLateEntryFeedback } from "../../services/feedbackService";

const LateFeedbackEntries = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const loadFeedbacks = async (nextPage = pagination.current, nextSearch = search) => {
    try {
      setLoading(true);
      const response = await getLateEntryFeedbacks({
        page: nextPage,
        limit: pagination.pageSize,
        search: nextSearch,
      });
      const result = response?.data || {};
      setFeedbacks(result.feedbacks || []);
      setPagination((current) => ({
        ...current,
        current: result.pagination?.page || nextPage,
        total: result.pagination?.total || 0,
      }));
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể tải danh sách feedback cần rà soát");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadFeedbacks(1, ""); }, 0);
    return () => window.clearTimeout(initialLoad);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      title: "Nhân viên",
      key: "employee",
      width: 240,
      render: (_, record) => {
        const employee = record.createdBy;
        const name = employee?.fullName || employee?.username || "Tài khoản đã bị xóa";
        return (
          <div className="flex items-center gap-3">
            <UserAvatar size={36} user={employee} className="shrink-0 border border-slate-200">
              {name.charAt(0).toUpperCase()}
            </UserAvatar>
            <div className="min-w-0"><div className="truncate font-medium text-slate-800">{name}</div><div className="text-xs text-slate-400">{employee?.username ? `@${employee.username}` : "—"}</div></div>
          </div>
        );
      },
    },
    {
      title: "Ngày feedback",
      dataIndex: "dateTime",
      width: 145,
      render: (value) => dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: "Cờ kiểm tra",
      key: "flag",
      width: 190,
      render: (_, record) => (
        <div><Tag color="warning" icon={<WarningOutlined />}>Nhập lùi {record.lateEntryDays || 1} ngày</Tag><div className="mt-1 text-xs text-slate-400">Gắn cờ: {record.lateEntryFlaggedAt ? dayjs(record.lateEntryFlaggedAt).format("DD/MM/YYYY HH:mm") : "—"}</div></div>
      ),
    },
    {
      title: "Feedback",
      dataIndex: "content",
      key: "content",
      render: (value) => value ? <Tooltip title={value}><div className="max-w-[440px] whitespace-pre-wrap break-words text-slate-700">{value}</div></Tooltip> : <span className="text-slate-400">Không có nội dung</span>,
    },
    { title: "Bàn", dataIndex: "tableNumber", width: 90, align: "center", render: (value) => value ? <Tag color="orange">{value}</Tag> : "—" },
    { title: "Nhập lúc", dataIndex: "createdAt", width: 160, render: (value) => dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—" },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedFeedback(record)} aria-label="Xem chi tiết feedback" />
          </Tooltip>
          <Popconfirm title="Xác nhận có lý do?" description="Mục này sẽ được gỡ khỏi danh sách cần rà soát. Feedback gốc vẫn được giữ nguyên." okText="Xác nhận" cancelText="Hủy" onConfirm={() => handleResolve(record._id)}>
            <Tooltip title="Xác nhận có lý do nhập trễ">
              <Button type="text" className="text-emerald-600 hover:!text-emerald-700" icon={<CheckOutlined />} loading={resolvingId === record._id} aria-label="Xác nhận có lý do nhập trễ" />
            </Tooltip>
          </Popconfirm>
          <Popconfirm title="Xóa feedback?" description="Feedback sẽ bị xóa vĩnh viễn." okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(record._id)}>
            <Button danger type="text" icon={<DeleteOutlined />} loading={deletingId === record._id} aria-label="Xóa feedback" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSearch = () => { void loadFeedbacks(1, search.trim()); };

  const handleResolve = async (id) => {
    try {
      setResolvingId(id);
      await resolveLateEntryFeedback(id);
      message.success("Đã xác nhận nhân viên có lý do nhập trễ");
      const pageAfterResolve = feedbacks.length === 1 && pagination.current > 1
        ? pagination.current - 1
        : pagination.current;
      await loadFeedbacks(pageAfterResolve);
      setSelectedFeedback((current) => current?._id === id ? null : current);
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể xác nhận feedback nhập trễ");
    } finally {
      setResolvingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await deleteFeedback(id);
      message.success("Đã xóa feedback");
      const pageAfterDelete = feedbacks.length === 1 && pagination.current > 1
        ? pagination.current - 1
        : pagination.current;
      await loadFeedbacks(pageAfterDelete);
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể xóa feedback");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="erp-page-header">
        <div><div className="erp-page-eyebrow">Quản trị hệ thống</div><h1 className="erp-page-title">Feedback Trễ</h1><p className="erp-page-description">Chỉ admin thấy các feedback được nhập với ngày trước ngày nhập.</p></div>
      </div>
      <Card className="erp-section-card erp-filter-card mb-4">
        <div className="flex flex-col gap-3 sm:flex-row"><Input value={search} onChange={(event) => setSearch(event.target.value)} onPressEnter={handleSearch} placeholder="Tìm nội dung, khách hàng, bàn hoặc meal" prefix={<SearchOutlined className="text-slate-400" />} allowClear /><Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>Tìm</Button><Button icon={<ReloadOutlined />} onClick={() => { setSearch(""); void loadFeedbacks(1, ""); }} loading={loading}>Làm mới</Button></div>
      </Card>
      <Card className="erp-section-card erp-table-card" styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={feedbacks} loading={loading} scroll={{ x: 1230 }} pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: false, showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`, onChange: (page) => { void loadFeedbacks(page); } }} locale={{ emptyText: "Chưa có feedback nào bị gắn cờ" }} />
      </Card>
      <Modal title="Chi tiết feedback" open={Boolean(selectedFeedback)} onCancel={() => setSelectedFeedback(null)} footer={<Button onClick={() => setSelectedFeedback(null)}>Đóng</Button>} width="min(680px, calc(100vw - 24px))">
        {selectedFeedback && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nhân viên">{selectedFeedback.createdBy?.fullName || selectedFeedback.createdBy?.username || "Tài khoản đã bị xóa"}</Descriptions.Item>
            <Descriptions.Item label="Ngày feedback">{dayjs(selectedFeedback.dateTime).isValid() ? dayjs(selectedFeedback.dateTime).format("DD/MM/YYYY") : "—"}</Descriptions.Item>
            <Descriptions.Item label="Nhập lúc">{dayjs(selectedFeedback.createdAt).isValid() ? dayjs(selectedFeedback.createdAt).format("DD/MM/YYYY HH:mm") : "—"}</Descriptions.Item>
            <Descriptions.Item label="Cờ kiểm tra"><Tag color="warning" icon={<WarningOutlined />}>Nhập lùi {selectedFeedback.lateEntryDays || 1} ngày</Tag></Descriptions.Item>
            <Descriptions.Item label="Khách hàng">{selectedFeedback.customerName || "Khách vãng lai"}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{selectedFeedback.customerPhone || "—"}</Descriptions.Item>
            <Descriptions.Item label="Bàn">{selectedFeedback.tableNumber || "—"}</Descriptions.Item>
            <Descriptions.Item label="Meal">{selectedFeedback.meal || "—"}</Descriptions.Item>
            <Descriptions.Item label="Nhãn">{selectedFeedback.tags?.length ? selectedFeedback.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : "—"}</Descriptions.Item>
            <Descriptions.Item label="Nội dung"><div className="whitespace-pre-wrap break-words">{selectedFeedback.content || "Không có nội dung"}</div></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default LateFeedbackEntries;
