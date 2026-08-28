import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from "antd";

import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";

import dayjs from "dayjs";

import {
  createFeedback,
  deleteFeedback,
  getFeedbacks,
  updateFeedback,
} from "../../services/feedbackService";

import FeedbackTable from "./FeedbackTable";
import { useAuth } from "../../store/AuthContext";
import { getFeedbackTags } from "../../services/feedbackTag.service";

const Feedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [form] = Form.useForm();

  const [formModalOpen, setFormModalOpen] = useState(false);

  const [editingFeedback, setEditingFeedback] = useState(null);
  const [presetTags, setPresetTags] = useState([]);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // =========================
  // LOAD FEEDBACK
  // =========================

  const loadFeedbacks = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getFeedbacks({
        page: pagination.current,
        limit: pagination.pageSize,
      });

      const data = response.data?.feedbacks ?? response.data ?? [];

      setFeedbacks(Array.isArray(data) ? data : []);

      setPagination((previous) => ({
        ...previous,
        total:
          response.pagination?.total ?? response.data?.pagination?.total ?? 0,
      }));
    } catch (error) {
      console.error("Load feedbacks error:", error);

      message.error(
        error.response?.data?.message || "Không thể tải danh sách feedback",
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => {
    void loadFeedbacks();
  }, [loadFeedbacks]);

  const canUsePresetTags = ["premium", "admin"].includes(user?.role);

  const handleInsertPresetTag = (label) => {
    const currentContent = form.getFieldValue("content") || "";
    const separator = currentContent.trim() ? ", " : "";
    form.setFieldValue("content", `${currentContent}${separator}${label}`);
  };

  useEffect(() => {
    if (!canUsePresetTags) {
      setPresetTags([]);
      return;
    }

    getFeedbackTags()
      .then((response) => setPresetTags(Array.isArray(response?.data) ? response.data : []))
      .catch(() => setPresetTags([]));
  }, [canUsePresetTags]);

  // =========================
  // OPEN CREATE
  // =========================

  const handleCreate = () => {
    setEditingFeedback(null);

    form.resetFields();

    form.setFieldsValue({
      dateTime: dayjs(),
    });

    setFormModalOpen(true);
  };

  // =========================
  // OPEN EDIT
  // =========================

  const handleEdit = (record) => {
    setEditingFeedback(record);

    form.setFieldsValue({
      customerName: record.customerName || "",
      customerPhone: record.customerPhone || "",
      tableNumber: record.tableNumber || "",
      meal: record.meal || undefined,
      tags: Array.isArray(record.tags) ? record.tags : [],
      content: record.content || "",

      dateTime: record.dateTime
        ? dayjs(record.dateTime)
        : dayjs(record.createdAt),
    });

    setFormModalOpen(true);
  };

  // =========================
  // CLOSE FORM
  // =========================

  const handleCloseForm = () => {
    if (saving) return;

    setFormModalOpen(false);

    setEditingFeedback(null);

    form.resetFields();
  };

  // =========================
  // SUBMIT CREATE / UPDATE
  // =========================

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      console.log("FORM VALUES:", values);
      console.log("DATE:", values.dateTime?.format("DD/MM/YYYY"));

      const payload = {
        customerName: values.customerName?.trim() || "",
        customerPhone: values.customerPhone?.trim() || "",
        tableNumber: values.tableNumber?.trim() || "",
        meal: values.meal || "",
        tags: Array.isArray(values.tags) ? values.tags : [],
        content: values.content?.trim() || "",

        dateTime: values.dateTime ? values.dateTime.toISOString() : null,
      };

      console.log("PAYLOAD:", payload);
      // UPDATE
      if (editingFeedback) {
        await updateFeedback(editingFeedback._id, payload);

        message.success("Đã cập nhật feedback");
      }

      // CREATE
      else {
        await createFeedback(payload);

        message.success("Đã thêm feedback");
      }

      handleCloseForm();

      await loadFeedbacks();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("Save feedback error:", error);

      message.error(error.response?.data?.message || "Không thể lưu feedback");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);

      await deleteFeedback(id);

      message.success("Đã xóa feedback");

      if (feedbacks.length === 1 && pagination.current > 1) {
        setPagination((previous) => ({
          ...previous,
          current: previous.current - 1,
        }));
      } else {
        await loadFeedbacks();
      }
    } catch (error) {
      console.error("Delete feedback error:", error);

      message.error(error.response?.data?.message || "Không thể xóa feedback");
    } finally {
      setDeletingId(null);
    }
  };

  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (value) => {
    if (!value || !dayjs(value).isValid()) {
      return "—";
    }

    return dayjs(value).format("DD/MM/YYYY HH:mm");
  };

  return (
    <div>
      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">Chăm sóc khách hàng</div>

          <h1 className="erp-page-title">Phản hồi khách hàng</h1>

          <p className="erp-page-description">
            Theo dõi và xử lý các ý kiến khách hàng gửi về nhà hàng.
          </p>
        </div>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            size="large"
            loading={loading}
            onClick={loadFeedbacks}
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleCreate}
          >
            Thêm feedback
          </Button>
        </Space>
      </div>

      {/* =========================
          TABLE
      ========================= */}

      <Card
        className="erp-section-card erp-table-card"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <FeedbackTable
          feedbacks={feedbacks}
          loading={loading}
          deletingId={deletingId}
          pagination={pagination}
          onView={setSelectedFeedback}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPaginationChange={(current, pageSize) =>
            setPagination((previous) => ({
              ...previous,

              current: pageSize !== previous.pageSize ? 1 : current,

              pageSize,
            }))
          }
        />
      </Card>

      {/* =========================
          VIEW MODAL
      ========================= */}

      <Modal
        title="Chi tiết phản hồi"
        open={Boolean(selectedFeedback)}
        footer={<Button onClick={() => setSelectedFeedback(null)}>Đóng</Button>}
        onCancel={() => setSelectedFeedback(null)}
        width="min(640px, calc(100vw - 24px))"
        className="erp-feedback-modal"
        style={{ top: 12 }}
        styles={{
          body: {
            maxHeight: "calc(100dvh - 180px)",
            overflowY: "auto",
            overflowX: "hidden",
          },
        }}
        maskClosable
        keyboard
      >
        {selectedFeedback && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Khách hàng">
              {selectedFeedback.customerName || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Số điện thoại">
              {selectedFeedback.customerPhone || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Bàn">
              {selectedFeedback.tableNumber || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Bữa ăn">
              {selectedFeedback.meal || "—"}
            </Descriptions.Item>


            <Descriptions.Item label="Nội dung">
              <span className="whitespace-pre-wrap">
                {selectedFeedback.content || "—"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày feedback">
              {formatDate(selectedFeedback.feedbackDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian gửi">
              {formatDate(selectedFeedback.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật">
              {formatDate(selectedFeedback.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* =========================
          CREATE / EDIT MODAL
      ========================= */}

      <Modal
        title={editingFeedback ? "Chỉnh sửa feedback" : "Thêm feedback"}
        open={formModalOpen}
        onCancel={handleCloseForm}
        onOk={handleSubmit}
        okText={editingFeedback ? "Lưu thay đổi" : "Thêm feedback"}
        cancelText="Hủy"
        confirmLoading={saving}
        width="min(760px, calc(100vw - 24px))"
        className="erp-feedback-modal"
        style={{ top: 12 }}
        styles={{
          body: {
            maxHeight: "calc(100dvh - 180px)",
            overflowY: "auto",
            overflowX: "hidden",
          },
        }}
        destroyOnHidden
        maskClosable
        keyboard
      >
        <Form form={form} layout="vertical" className="mt-4">
          {/* ROW 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            {/* CUSTOMER */}
            <Form.Item label="Tên khách hàng" name="customerName">
              <Input placeholder="Nhập tên khách hàng" size="large" />
            </Form.Item>

            {/* PHONE */}
            <Form.Item label="Số điện thoại" name="customerPhone">
              <Input placeholder="Nhập số điện thoại" size="large" />
            </Form.Item>

            {/* TABLE */}
            <Form.Item label="Số bàn" name="tableNumber">
              <Input placeholder="Ví dụ: A12" size="large" />
            </Form.Item>

            {/* DATE */}
            <Form.Item
              label="Ngày feedback"
              name="dateTime"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn ngày feedback",
                },
              ]}
            >
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder="Chọn ngày feedback"
                allowClear={false}
              />
            </Form.Item>

            {/* MEAL */}
            <Form.Item label="Bữa ăn" name="meal">
              <Select
                size="large"
                placeholder="Chọn bữa ăn"
                allowClear
                options={[
                  { label: "Alacarte", value: "Alacarte" },
                  { label: "Abalon", value: "Abalon" },
                  { label: "Saigon", value: "Saigon" },
                  { label: "San", value: "San" },
                  { label: "Saikyo", value: "Saikyo" },
                  { label: "Umami", value: "Umami" },
                  { label: "Yakiuo", value: "Yakiuo" },
                ]}
              />
            </Form.Item>

          </div>

          {/* CONTENT */}
          {canUsePresetTags && presetTags.length > 0 && (
            <div className="mb-3 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
              <div className="mb-2 text-xs font-semibold text-purple-700">Nhãn gợi ý — bấm để chèn vào nội dung</div>
              <div className="flex flex-wrap gap-2">
                {presetTags.map((tag) => (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => handleInsertPresetTag(tag.label)}
                    className="rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Form.Item
            label="Nội dung feedback"
            name="content"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập nội dung feedback",
              },
            ]}
          >
            <Input.TextArea
              placeholder="Nhập nội dung phản hồi..."
              rows={4}
              showCount
              maxLength={2000}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Feedback;
