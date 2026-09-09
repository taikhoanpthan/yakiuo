import {
  Button,
  Card,
  Tag,
  Empty,
} from "antd";

import {
  DeleteOutlined,
  CheckCircleFilled,
  DollarOutlined,
  EditOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import HamsterLoader from "../../components/common/HamsterLoader";

const CommissionHistory = ({
  commissions = [],
  total = 0,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onEdit,
  onDelete,
  onLoadMore,
  onToggleBillCollected,
}) => {
  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString(
      "vi-VN"
    )} đ`;
  };

  const getTypeLabel = (item) => {
    if (item.type === "wine") {
      return item.wineLevel === "3m"
        ? "Rượu > 3 triệu"
        : "Rượu > 1 triệu";
    }

    return "Bào ngư";
  };

  const getShiftLabel = (shift) => {
    if (shift === "morning") {
      return "Ca sáng";
    }

    if (shift === "afternoon") {
      return "Ca chiều";
    }

    if (shift === "evening") {
      return "Ca tối";
    }

    return shift || "--";
  };

  const getTypeColor = (type) => {
    return type === "wine"
      ? "blue"
      : "purple";
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <DollarOutlined />

          <span>Lịch sử commission</span>

          <Tag>{total}</Tag>
        </div>
      }
      className="erp-section-card"
    >
      {/* LOADING */}

      {loading ? (
        <div className="flex justify-center py-8">
          <HamsterLoader size="sm" />
        </div>
      ) : commissions.length === 0 ? (
        /* EMPTY */

        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có commission nào"
        />
      ) : (
        /* LIST */

        <div className="space-y-3">
          {commissions.map((item) => (
            <div
              key={item._id}
              className={`rounded-2xl border p-4 transition ${item.billCollected ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50 hover:border-slate-200"}`}
              role="button"
              tabIndex={0}
              onClick={() => onToggleBillCollected?.(item)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onToggleBillCollected?.(item); }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* =========================
                    INFO
                ========================= */}

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag
                      color={getTypeColor(
                        item.type
                      )}
                    >
                      {item.type === "wine"
                        ? "🍷 Rượu"
                        : "🦪 Bào ngư"}
                    </Tag>

                    <span className="font-semibold text-slate-800">
                      {getTypeLabel(item)}
                    </span>
                    {item.billCollected && <Tag color="green" icon={<CheckCircleFilled />}>Đã lấy bill</Tag>}
                  </div>

                  {/* META */}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      📅{" "}
                      {item.date
                        ? dayjs(
                            item.date
                          ).format(
                            "DD/MM/YYYY"
                          )
                        : "--"}
                    </span>

                    <span>
                      🪑 Bàn{" "}
                      {item.tableNumber ||
                        "--"}
                    </span>

                    <span>
                      🕐{" "}
                      {getShiftLabel(
                        item.shift
                      )}
                    </span>
                  </div>

                  {/* QUANTITY */}

                  <div className="mt-2 text-xs text-slate-400">
                    {item.type === "wine"
                      ? `${item.wineQty || 0} chai`
                      : `${item.abaloneQty || 0} con`}
                  </div>
                </div>

                {/* =========================
                    RIGHT
                ========================= */}

                <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                  {/* MONEY */}

                  <div className="text-lg font-bold text-emerald-600">
                    +{formatMoney(
                      item.commission
                    )}
                  </div>

                  {/* ACTION */}

                  <div className="flex gap-1">
                    <Button
                      type="text"
                      size="small"
                      icon={
                        <EditOutlined />
                      }
                      onClick={(event) => { event.stopPropagation(); onEdit?.(item); }}
                    />

                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={
                        <DeleteOutlined />
                      }
                      onClick={(event) => { event.stopPropagation(); onDelete?.(item); }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button type="link" loading={loadingMore} onClick={onLoadMore}>
                Xem thêm
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CommissionHistory;
