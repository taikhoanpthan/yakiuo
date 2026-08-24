import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
  Tag,
  message,
} from "antd";

import {
  CalculatorOutlined,
  CalendarOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  NumberOutlined,
  PlusOutlined,
  ShopOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  createCommission,
  deleteCommission,
  getMyCommissions,
  updateCommission,
} from "../../services/commission.service";
import CommissionHistory from "./CommissionHistory";

const WINE_1M_COMMISSION = 20000;
const WINE_3M_COMMISSION = 50000;
const ABALONE_COMMISSION = 20000;

const Commission = () => {
  const [form] = Form.useForm();

  // =========================
  // UI STATE
  // =========================

  const [expanded, setExpanded] = useState(false);

  const [type, setType] = useState("wine");

  const [submitting, setSubmitting] = useState(false);

  const [loadingCommissions, setLoadingCommissions] = useState(false);

  const [commissions, setCommissions] = useState([]);

  const [editingId, setEditingId] = useState(null);

  // =========================
  // WATCH FORM
  // =========================

  const wineLevel = Form.useWatch("wineLevel", form);

  const wineQty = Form.useWatch("wineQty", form) || 0;

  const abaloneQty = Form.useWatch("abaloneQty", form) || 0;

  // =========================
  // COMMISSION / CHAI
  // =========================

  const wineCommission = useMemo(() => {
    if (wineLevel === "1m") {
      return WINE_1M_COMMISSION;
    }

    if (wineLevel === "3m") {
      return WINE_3M_COMMISSION;
    }

    return 0;
  }, [wineLevel]);

  // =========================
  // TOTAL COMMISSION
  // =========================

  const commission = useMemo(() => {
    if (type === "wine") {
      return wineQty * wineCommission;
    }

    if (type === "abalone") {
      return abaloneQty * ABALONE_COMMISSION;
    }

    return 0;
  }, [type, wineQty, wineCommission, abaloneQty]);

  // =========================
  // FORMAT MONEY
  // =========================

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
  };

  // =========================
  // LOAD COMMISSIONS
  // =========================

  const loadCommissions = async () => {
    try {
      setLoadingCommissions(true);

      const response = await getMyCommissions();

      setCommissions(response?.data || []);
    } catch (error) {
      console.error("GET COMMISSIONS ERROR:", error);

      message.error(
        error?.response?.data?.message || "Không thể tải danh sách commission",
      );
    } finally {
      setLoadingCommissions(false);
    }
  };

  // =========================
  // LOAD FIRST TIME
  // =========================

  useEffect(() => {
    loadCommissions();
  }, []);

  // =========================
  // CHANGE TYPE
  // =========================

  const handleTypeChange = (value) => {
    setType(value);

    form.setFieldsValue({
      type: value,

      wineLevel: undefined,
      wineQty: undefined,

      abaloneQty: undefined,

      tableNumber: undefined,
    });
  };

  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {
    form.resetFields();

    form.setFieldsValue({
      date: dayjs(),
      type: "wine",
    });

    setType("wine");

    setEditingId(null);
  };

  // =========================
  // SUBMIT
  // =========================

  const handleFinish = async (values) => {
    try {
      setSubmitting(true);

      const payload = {
        date: values.date ? values.date.format("YYYY-MM-DD") : null,

        type: values.type,

        tableNumber: values.tableNumber,

        shift: values.shift,

        wineLevel: values.type === "wine" ? values.wineLevel : null,

        wineQty: values.type === "wine" ? values.wineQty : 0,

        abaloneQty: values.type === "abalone" ? values.abaloneQty : 0,
      };

      // =========================
      // UPDATE
      // =========================

      if (editingId) {
        await updateCommission(editingId, payload);

        message.success("Cập nhật commission thành công");
      }

      // =========================
      // CREATE
      // =========================
      else {
        await createCommission(payload);

        message.success("Thêm commission thành công");
      }

      // Load lại danh sách
      await loadCommissions();

      // Reset
      resetForm();

      // Đóng form
      setExpanded(false);
    } catch (error) {
      console.error("COMMISSION SUBMIT ERROR:", error);

      message.error(
        error?.response?.data?.message || "Không thể lưu commission",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // EDIT
  // =========================

  const handleEdit = (item) => {
    setEditingId(item._id);

    setExpanded(true);

    setType(item.type);

    form.setFieldsValue({
      date: item.date ? dayjs(item.date) : dayjs(),

      type: item.type,

      tableNumber: item.tableNumber,

      shift: item.shift,

      wineLevel: item.type === "wine" ? item.wineLevel : undefined,

      wineQty: item.type === "wine" ? item.wineQty : undefined,

      abaloneQty: item.type === "abalone" ? item.abaloneQty : undefined,
    });
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id) => {
    try {
      await deleteCommission(id);

      message.success("Xóa commission thành công");

      // Load lại
      await loadCommissions();

      // Nếu đang edit record vừa xóa
      if (editingId === id) {
        resetForm();
        setExpanded(false);
      }
    } catch (error) {
      console.error("DELETE COMMISSION ERROR:", error);

      message.error(
        error?.response?.data?.message || "Không thể xóa commission",
      );
    }
  };

  // =========================
  // TYPE LABEL
  // =========================

  const getTypeLabel = (item) => {
    if (item.type === "wine") {
      if (item.wineLevel === "3m") {
        return "Rượu > 3 triệu";
      }

      return "Rượu > 1 triệu";
    }

    return "Bào ngư";
  };

  // =========================
  // TYPE COLOR
  // =========================

  const getTypeColor = (item) => {
    if (item.type === "wine") {
      return "blue";
    }

    return "purple";
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="space-y-4">
      {/* =====================================================
          COMMISSION HEADER / FORM
      ===================================================== */}

      <Card className="erp-section-card">
        {/* HEADER */}

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <DollarOutlined className="text-xl text-slate-600" />
              </div>

              <div className="min-w-0">
                <h3 className="m-0 text-base font-semibold text-slate-800">
                  Commission thường
                </h3>

                <p className="mt-1 mb-0 text-xs text-slate-400">
                  Rượu & Bào ngư
                </p>
              </div>
            </div>

            <Tag color={expanded ? "blue" : "default"}>
              {expanded
                ? editingId
                  ? "Đang sửa"
                  : "Đang nhập"
                : "Bấm để nhập"}
            </Tag>
          </div>
        </button>

        {/* =================================================
            FORM
        ================================================= */}

        {expanded && (
          <>
            <Divider className="my-5" />

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{
                date: dayjs(),
                type: "wine",
              }}
              onFinish={handleFinish}
            >
              {/* ===============================
                  DATE + SHIFT
              =============================== */}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* DATE */}

                <Form.Item
                  label="Ngày"
                  name="date"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn ngày",
                    },
                  ]}
                >
                  <DatePicker
                    size="large"
                    className="w-full"
                    format="DD/MM/YYYY"
                    suffixIcon={<CalendarOutlined />}
                  />
                </Form.Item>

                {/* SHIFT */}

                <Form.Item
                  label="Ca"
                  name="shift"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn ca",
                    },
                  ]}
                >
                  <Select
                    size="large"
                    placeholder="Chọn ca"
                    options={[
                      {
                        value: "morning",
                        label: "Ca sáng",
                      },
                      {
                        value: "afternoon",
                        label: "Ca chiều",
                      },
                      {
                        value: "evening",
                        label: "Ca tối",
                      },
                    ]}
                  />
                </Form.Item>
              </div>

              {/* ===============================
                  TYPE
              =============================== */}

              <Form.Item
                label="Loại commission"
                name="type"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng chọn loại commission",
                  },
                ]}
              >
                <Select
                  size="large"
                  onChange={handleTypeChange}
                  options={[
                    {
                      value: "wine",
                      label: "🍷 Rượu",
                    },
                    {
                      value: "abalone",
                      label: "🦪 Bào ngư",
                    },
                  ]}
                />
              </Form.Item>

              {/* =================================================
                  WINE
              ================================================= */}

              {type === "wine" && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="mb-4">
                    <div className="font-semibold text-slate-800">
                      Thông tin rượu
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Chọn mức rượu, bàn và số lượng.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* WINE LEVEL */}

                    <Form.Item
                      label="Mức rượu"
                      name="wineLevel"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn mức rượu",
                        },
                      ]}
                    >
                      <Select
                        size="large"
                        placeholder="Chọn mức rượu"
                        options={[
                          {
                            value: "1m",
                            label: "> 1 triệu — 20.000đ/chai",
                          },
                          {
                            value: "3m",
                            label: "> 3 triệu — 50.000đ/chai",
                          },
                        ]}
                      />
                    </Form.Item>

                    {/* WINE QTY */}

                    <Form.Item
                      label="Số lượng chai"
                      name="wineQty"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập số lượng chai",
                        },
                        {
                          type: "number",
                          min: 1,
                          message: "Số lượng tối thiểu là 1",
                        },
                      ]}
                    >
                      <InputNumber
                        size="large"
                        className="w-full"
                        prefix={<NumberOutlined />}
                        min={1}
                        precision={0}
                        placeholder="Nhập số lượng"
                      />
                    </Form.Item>
                  </div>

                  {/* TABLE */}

                  <Form.Item
                    label="Bàn"
                    name="tableNumber"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số bàn",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<ShopOutlined />}
                      placeholder="VD: T2, A12, VIP01..."
                    />
                  </Form.Item>

                  {/* WINE INFO */}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <div className="text-xs text-slate-400">
                        Commission / chai
                      </div>

                      <div className="mt-1 text-lg font-semibold text-slate-700">
                        {formatMoney(wineCommission)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <div className="text-xs text-slate-400">Số lượng</div>

                      <div className="mt-1 text-lg font-semibold text-slate-700">
                        {wineQty || 0} chai
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================
                  ABALONE
              ================================================= */}

              {type === "abalone" && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="mb-4">
                    <div className="font-semibold text-slate-800">
                      Thông tin bào ngư
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Commission 20.000đ / con.
                    </div>
                  </div>

                  {/* TABLE */}

                  <Form.Item
                    label="Bàn"
                    name="tableNumber"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số bàn",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<ShopOutlined />}
                      placeholder="VD: T2, A12, VIP01..."
                    />
                  </Form.Item>

                  {/* QTY */}

                  <Form.Item
                    label="Số lượng bào ngư"
                    name="abaloneQty"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số lượng bào ngư",
                      },
                      {
                        type: "number",
                        min: 1,
                        message: "Số lượng tối thiểu là 1",
                      },
                    ]}
                  >
                    <InputNumber
                      size="large"
                      className="w-full"
                      prefix={<NumberOutlined />}
                      min={1}
                      precision={0}
                      placeholder="Nhập số lượng"
                    />
                  </Form.Item>

                  {/* INFO */}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-4">
                      <div className="text-xs text-slate-400">
                        Commission / con
                      </div>

                      <div className="mt-1 text-lg font-semibold text-slate-700">
                        {formatMoney(ABALONE_COMMISSION)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <div className="text-xs text-slate-400">Số lượng</div>

                      <div className="mt-1 text-lg font-semibold text-slate-700">
                        {abaloneQty || 0} con
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================
                  TOTAL
              ================================================= */}

              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <CalculatorOutlined className="text-lg text-slate-600" />
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">Commission</div>

                      <div className="mt-1 text-2xl font-bold text-slate-800">
                        {formatMoney(commission)}
                      </div>
                    </div>
                  </div>

                  {/* BUTTONS */}

                  <div className="flex gap-2">
                    <Button
                      size="large"
                      icon={<CloseOutlined />}
                      onClick={() => {
                        resetForm();
                        setExpanded(false);
                      }}
                    >
                      Hủy
                    </Button>

                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      icon={editingId ? <EditOutlined /> : <PlusOutlined />}
                      loading={submitting}
                    >
                      {editingId ? "Cập nhật" : "Thêm commission"}
                    </Button>
                  </div>
                </div>
              </div>
            </Form>
          </>
        )}
      </Card>

      <CommissionHistory
        commissions={commissions}
        loading={loadingCommissions}
        onEdit={handleEdit}
        onDelete={(item) => handleDelete(item._id)}
      />
    </div>
  );
};

export default Commission;
