import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Image,
  Popconfirm,
  Tooltip,
  Pagination,
  Empty,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useAuth } from "../../store/AuthContext";
import {
  getInventory,
  deleteInventoryItem,
} from "../../services/inventory.service";
import InventoryModal from "./InventoryModal";
import InventoryCheckModal from "./InventoryCheckModal";
import UserAvatar from "../../components/common/UserAvatar";
import HamsterLoader from "../../components/common/HamsterLoader";
import { onInventoryChanged } from "../../services/socket";
import "./Inventory.css";

const NO_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=160&q=80";

const Inventory = () => {
  const { user } = useAuth();
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
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortOption, setSortOption] = useState("createdAt-desc");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [itemToCheck, setItemToCheck] = useState(null);

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
    [pagination.page, pagination.limit, search, selectedStatus, sortOption],
  );

  useEffect(() => {
    fetchInventoryData(1);
  }, [selectedStatus, sortOption]);

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
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleOpenCheck = (item) => {
    setItemToCheck(item);
    setCheckModalOpen(true);
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
      width: 55,
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
      width: 90,
      align: "center",
      render: (imgUrl, record) => (
        <div className="inventory-thumb-wrap">
          <Image
            width={44}
            height={44}
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
      render: (text) => (
        <div className="inventory-item-name">
          {text}
        </div>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Vị trí</span>,
      dataIndex: "location",
      key: "location",
      width: 140,
      render: (loc) => (
        <span className={loc ? "inventory-item-location" : "inventory-item-location-empty"}>
          {loc || "Chưa phân vị trí"}
        </span>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Số lượng tồn</span>,
      dataIndex: "quantity",
      key: "quantity",
      width: 160,
      render: (qty, record) => {
        const isOut = qty === 0;
        const isLow = !isOut && qty <= (record.minQuantity ?? 5);

        let pillClass = "is-in-stock";
        let statusLabel = "Còn hàng";

        if (isOut) {
          pillClass = "is-out-of-stock";
          statusLabel = "Hết hàng";
        } else if (isLow) {
          pillClass = "is-low-stock";
          statusLabel = "Sắp hết";
        }

        return (
          <div className="flex items-center gap-2.5">
            <span className="inventory-item-qty">
              {qty}
            </span>
            <span className={`inventory-status-pill ${pillClass}`}>
              <span className="inventory-status-dot" />
              <span>{statusLabel}</span>
            </span>
          </div>
        );
      },
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Mức tối thiểu</span>,
      dataIndex: "minQuantity",
      key: "minQuantity",
      width: 110,
      align: "center",
      render: (minQty) => (
        <span className="font-mono text-xs font-semibold" style={{ color: "#d97706" }}>
          &le; {minQty ?? 5}
        </span>
      ),
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Ghi chú kiểm kê</span>,
      dataIndex: "notes",
      key: "notes",
      width: 220,
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
      width: 170,
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
      title: <span style={{ whiteSpace: "nowrap" }}>Thao tác</span>,
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={6}>
          <Tooltip title="Kiểm kê số lượng thực tế">
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CheckCircleOutlined />}
              onClick={() => handleOpenCheck(record)}
            >
              Kiểm kê
            </Button>
          </Tooltip>

          {isAdmin && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEdit(record)}
                />
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

          {isAdmin && (
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
            {isAdmin && (
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
              pageSizeOptions={["15", "30", "50"]}
            />
          </div>
        </Card>
      )}

      {/* ADMIN ADD/EDIT MODAL */}
      <InventoryModal
        open={modalOpen}
        editingItem={editingItem}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => fetchInventoryData()}
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
