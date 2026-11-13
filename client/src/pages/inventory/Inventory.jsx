import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Image,
  Popconfirm,
  Tooltip,
  Pagination,
  Empty,
  Modal,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EditOutlined,
  MinusOutlined,
  FileTextOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useAuth } from "../../store/AuthContext";
import {
  getInventory,
  deleteInventoryItem,
  decrementInventoryItem,
} from "../../services/inventory.service";
import InventoryModal from "./InventoryModal";
import InventoryCheckModal from "./InventoryCheckModal";
import UserAvatar from "../../components/common/UserAvatar";
import HamsterLoader from "../../components/common/HamsterLoader";
import { onInventoryChanged } from "../../services/socket";
import { usePermissions } from "../../hooks/usePermissions";
import "./Inventory.css";

const NO_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=160&q=80";

const getInventoryStatus = (quantity, minQuantity) => {
  if (quantity <= 0) return { className: "is-out-of-stock", label: "Hết hàng" };
  if (quantity <= (minQuantity ?? 5)) return { className: "is-low-stock", label: "Sắp hết" };
  return { className: "is-in-stock", label: "Còn hàng" };
};

const Inventory = () => {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canCreateInventory = can("inventory.create");
  const canUpdateInventory = can("inventory.update");
  const canDeleteInventory = can("inventory.delete");
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalQuantity: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortOption, setSortOption] = useState("createdAt-desc");
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [exportingPdf, setExportingPdf] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [itemToCheck, setItemToCheck] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  const fetchInventoryData = useCallback(
    async (pageOverride) => {
      try {
        setLoading(true);
        const [sortBy, sortOrder] = sortOption.split("-");
        const currentPage = pageOverride ?? pagination.page;

        const res = await getInventory({
          page: currentPage,
          limit: pagination.limit,
          search,
          status: selectedStatus,
          checkedMonth: selectedMonth,
          sortBy,
          sortOrder,
        });

        if (res.success && res.data) {
          setItems(res.data.items || []);
          setStats(
            res.data.stats || {
              totalItems: 0,
              totalQuantity: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
              inStockCount: 0,
            },
          );
          setPagination(
            res.data.pagination || {
              page: currentPage,
              limit: pagination.limit,
              total: 0,
              totalPages: 1,
            },
          );
        }
      } catch (error) {
        console.error("Fetch inventory error:", error);
        message.error("Không thể tải danh sách hàng hóa");
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, search, selectedStatus, sortOption, selectedMonth],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchInventoryData(1);
    }, search ? 250 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [search, selectedStatus, sortOption, selectedMonth]);

  useEffect(() => {
    const unsubscribe = onInventoryChanged(() => {
      fetchInventoryData();
    });
    return () => unsubscribe();
  }, [fetchInventoryData]);

  const handleSearch = (value) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage, newPageSize) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
      limit: newPageSize || prev.limit,
    }));
    fetchInventoryData(newPage);
  };

  const handleOpenAdd = () => {
    setModalOpen(true);
  };

  const handleOpenCheck = (item) => {
    setItemToCheck(item);
    setCheckModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDecrement = (item) => {
    let amount = 1;
    Modal.confirm({
      title: `Trừ số lượng: ${item.name}`,
      content: <InputNumber min={1} max={item.quantity} defaultValue={1} autoFocus style={{ width: "100%", marginTop: 12 }} onChange={(value) => { amount = Number(value) || 0; }} />,
      okText: "Trừ số lượng",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        await decrementInventoryItem(item._id, amount);
        message.success(`Đã trừ ${amount} ${item.unit || "cái"} khỏi "${item.name}"`);
        await fetchInventoryData();
      },
    });
  };

  const handleDownloadMonthlyPdf = async () => {
    try {
      setExportingPdf(true);
      const response = await getInventory({
        page: 1,
        limit: 1000,
        checkedMonth: selectedMonth,
        sortBy: "name",
        sortOrder: "asc",
      });
      const monthlyItems = response.data?.items || [];
      if (!monthlyItems.length) {
        message.info("Không có dữ liệu kiểm kê trong tháng đã chọn");
        return;
      }
      const { downloadInventoryMonthlyPdf } = await import("../../utils/inventoryPdf");
      await downloadInventoryMonthlyPdf({ items: monthlyItems, month: selectedMonth });
    } catch (error) {
      console.error("Download inventory PDF failed:", error);
      message.error("Không thể tạo báo cáo PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInventoryItem(id);
      message.success("Đã xóa hàng hóa thành công");
      fetchInventoryData();
    } catch (error) {
      console.error("Delete failed:", error);
      message.error(error.response?.data?.message || "Không thể xóa hàng hóa");
    }
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 48,
      align: "center",
      render: (_, __, index) => (
        <span className="text-slate-400 font-mono text-xs">
          {(pagination.page - 1) * pagination.limit + index + 1}
        </span>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Hình ảnh</span>,
      dataIndex: "image",
      key: "image",
      width: 68,
      align: "center",
      render: (imgUrl, record) => (
        <div className="inventory-thumb-wrap">
          <Image
            width={38}
            height={38}
            src={imgUrl || NO_IMAGE_PLACEHOLDER}
            alt={record.name}
            fallback={NO_IMAGE_PLACEHOLDER}
            className="inventory-thumb"
            preview={{ mask: "Xem" }}
          />
        </div>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Tên hàng hóa</span>,
      dataIndex: "name",
      key: "name",
      width: 210,
      render: (text) => (
        <div className="inventory-item-name" title={text}>
          {text}
        </div>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Vị trí</span>,
      dataIndex: "location",
      key: "location",
      width: 155,
      render: (loc) => (
        <span className={loc ? "inventory-item-location" : "inventory-item-location-empty"} title={loc || "Chưa phân vị trí"}>
          {loc || "Chưa phân vị trí"}
        </span>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Số lượng ban đầu</span>,
      dataIndex: "initialQuantity",
      key: "initialQuantity",
      width: 130,
      render: (qty, record) => <span className="inventory-item-qty">{qty ?? record.quantity} {record.unit || "cái"}</span>,
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Số lượng hiện tại</span>,
      dataIndex: "quantity",
      key: "quantity",
      width: 105,
      render: (qty, record) => <span className="inventory-item-qty">{qty} {record.unit || "cái"}</span>,
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Trạng thái</span>,
      key: "status",
      width: 116,
      render: (_, record) => {
        const status = getInventoryStatus(record.quantity, record.minQuantity);
        return (
          <span className={`inventory-status-pill ${status.className}`}>
            <span className="inventory-status-dot" />
            <span>{status.label}</span>
          </span>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Mức tối thiểu</span>,
      dataIndex: "minQuantity",
      key: "minQuantity",
      width: 118,
      align: "center",
      render: (minQty, record) => (
        <span className="font-mono text-xs font-normal" style={{ color: "#a66b2f" }}>
          &le; {minQty ?? 5} {" "}
          <span className="font-sans font-normal">{record?.unit || "cái"}</span>
        </span>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Ghi chú kiểm kê</span>,
      dataIndex: "notes",
      key: "notes",
      width: 200,
      render: (notes) => (
        notes ? (
          <div className="inventory-notes-box" title={notes}>
            <FileTextOutlined style={{ color: "#875b35", fontSize: 13, marginTop: 2, flexShrink: 0 }} />
            <span className="inventory-notes-text">{notes}</span>
          </div>
        ) : (
          <span className="text-slate-300 dark:text-neutral-600 text-xs">—</span>
        )
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Kiểm kê gần nhất</span>,
      key: "lastChecked",
      width: 160,
      render: (_, record) => (
        <div>
          <div className="inventory-last-checked-time">
            {record.lastCheckedAt
              ? dayjs(record.lastCheckedAt).format("DD/MM/YYYY HH:mm")
              : "Chưa kiểm kê"}
          </div>
          {record.lastCheckedBy && (
            <div className="flex items-center gap-1.5 mt-1 inventory-last-checked-user">
              <UserAvatar size={18} user={record.lastCheckedBy} />
              <span>{record.lastCheckedBy.fullName || record.lastCheckedBy.username}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Chỉnh sửa</span>,
      key: "actions",
      width: 170,
      align: "center",
      render: (_, record) => (
        <Space size={6}>
          {isAdmin && canUpdateInventory && (
          <Tooltip title="Kiểm kê số lượng thực tế">
            <Button
              size="small"
              type="primary"
              ghost
              className="inventory-check-button"
              icon={<CheckCircleOutlined />}
              onClick={() => handleOpenCheck(record)}
            >
              Kiểm kê
            </Button>
          </Tooltip>
          )}

          {canUpdateInventory && !isAdmin && (
            <Tooltip title="Trừ số lượng đã sử dụng">
              <Button
                size="small"
                danger
                icon={<MinusOutlined />}
                disabled={record.quantity <= 0}
                onClick={() => handleDecrement(record)}
              >
                Trừ
              </Button>
            </Tooltip>
          )}

          {isAdmin && canUpdateInventory && canDeleteInventory && (
            <>
              <Tooltip title="Chỉnh sửa thông tin hàng hóa">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
              </Tooltip>
              <Popconfirm
                title="Xóa hàng hóa này?"
                description={`Bạn có chắc muốn xóa "${record.name}" khỏi danh sách?`}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(record._id)}
              >
                <Tooltip title="Xóa">
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="inventory-page-container">
      {/* HEADER TOOLBAR */}
      <div className="inventory-header">
        <div>
          <h1 className="inventory-header-title">Kiểm kê hàng hóa & dụng cụ</h1>
          <p className="inventory-header-desc">
            Theo dõi định mức tồn kho, vị trí lưu trữ và cập nhật số liệu kiểm kê thực tế
          </p>
        </div>

        <div className="inventory-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchInventoryData()}
            loading={loading}
          >
            Làm mới
          </Button>

          {canCreateInventory && isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
            >
              Thêm hàng hóa
            </Button>
          )}
        </div>
      </div>

      {/* SUMMARY METRICS BAR */}
      <div className="inventory-summary-bar">
        <div className="inventory-summary-pill">
          <span className="inventory-summary-dot" style={{ background: "#3b82f6" }} />
          <span className="inventory-summary-label">Tổng mặt hàng:</span>
          <strong className="inventory-summary-num">{stats.totalItems || 0}</strong>
        </div>

        <div className="inventory-summary-pill">
          <span className="inventory-summary-dot" style={{ background: "#10b981" }} />
          <span className="inventory-summary-label">Tổng số lượng tồn:</span>
          <strong className="inventory-summary-num" style={{ color: "#059669" }}>{stats.totalQuantity || 0}</strong>
        </div>

        <div className="inventory-summary-pill">
          <span className="inventory-summary-dot" style={{ background: "#f59e0b" }} />
          <span className="inventory-summary-label">Sắp hết hàng:</span>
          <strong className="inventory-summary-num" style={{ color: "#d97706" }}>{stats.lowStockCount || 0}</strong>
        </div>

        <div className="inventory-summary-pill">
          <span className="inventory-summary-dot" style={{ background: "#ef4444" }} />
          <span className="inventory-summary-label">Đã hết hàng:</span>
          <strong className="inventory-summary-num" style={{ color: "#dc2626" }}>{stats.outOfStockCount || 0}</strong>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="inventory-toolbar">
        <div className="inventory-toolbar-inner">
          <div className="inventory-search-input">
            <Input
              placeholder="Tìm theo tên hàng hóa, vị trí lưu kho..."
              prefix={<SearchOutlined style={{ color: "#9aa7b9" }} />}
              allowClear
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="inventory-filter-group">
            <DatePicker
              picker="month"
              allowClear={false}
              value={dayjs(selectedMonth)}
              onChange={(value) => setSelectedMonth(value.format("YYYY-MM"))}
              format="MM/YYYY"
              placeholder="Chọn tháng kiểm kê"
            />
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 160 }}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "in_stock", label: "Còn hàng" },
                { value: "low_stock", label: "Sắp hết" },
                { value: "out_of_stock", label: "Hết hàng" },
              ]}
            />

            <Select
              value={sortOption}
              onChange={setSortOption}
              style={{ width: 175 }}
              options={[
                { value: "createdAt-desc", label: "Mới nhất trước" },
                { value: "name-asc", label: "Tên A → Z" },
                { value: "quantity-desc", label: "Số lượng giảm dần" },
                { value: "quantity-asc", label: "Số lượng tăng dần" },
                { value: "minQuantity-desc", label: "Mức cảnh báo cao" },
                { value: "lastCheckedAt-desc", label: "Kiểm kê gần nhất" },
              ]}
            />

            <Button
              icon={<FilePdfOutlined />}
              loading={exportingPdf}
              onClick={handleDownloadMonthlyPdf}
            >
              Tải PDF
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      {loading && items.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <HamsterLoader />
        </div>
      ) : items.length === 0 ? (
        <Card className="inventory-table-card">
          <Empty
            description="Chưa có dữ liệu hàng hóa phù hợp"
            className="py-12"
          >
            {canCreateInventory && isAdmin && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
                Thêm hàng hóa đầu tiên
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Card className="inventory-table-card" styles={{ body: { padding: 0 } }}>
          <div className="inventory-table-container">
            <Table
              columns={columns}
              dataSource={items}
              rowKey="_id"
              loading={loading}
              pagination={false}
              size={isMobile ? "small" : "middle"}
              tableLayout="fixed"
              scroll={{ x: 1300 }}
            />
          </div>
          <div className="px-4 py-3 flex justify-end border-t border-slate-100 dark:border-neutral-800">
            <Pagination
              current={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              simple={isMobile}
              showTotal={
                isMobile
                  ? undefined
                  : (total, range) =>
                      `${range[0]}-${range[1]} trên tổng số ${total} hàng hóa`
              }
              onChange={handlePageChange}
              showSizeChanger={!isMobile}
              pageSizeOptions={["10", "20", "50"]}
            />
          </div>
        </Card>
      )}

      {/* ADMIN ADD MODAL */}
      <InventoryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => fetchInventoryData()}
        editingItem={editingItem}
      />

      {/* STAFF CHECK MODAL */}
      <InventoryCheckModal
        open={checkModalOpen}
        item={itemToCheck}
        onClose={() => {
          setCheckModalOpen(false);
          setItemToCheck(null);
        }}
        onSuccess={() => fetchInventoryData()}
      />
    </div>
  );
};

export default Inventory;
