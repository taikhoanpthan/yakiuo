import { useCallback, useEffect, useState } from "react";

import {
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  message,
} from "antd";

import {
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  createFeedback,
  deleteFeedback,
  getFeedbacks,
  updateFeedback,
} from "../../services/feedbackService";

import FeedbackTable from "./FeedbackTable";
import EmployeeDetail from "../users/EmployeeDetail";

import { useAuth } from "../../store/AuthContext";

import {
  getFeedbackTags,
} from "../../services/feedbackTag.service";

// =====================================================
// FEEDBACK
// =====================================================

const Feedback = () => {
  const { user } = useAuth();

  const [feedbacks, setFeedbacks] = useState([]);

  const [loading, setLoading] = useState(false);

  const [selectedFeedback, setSelectedFeedback] =
    useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [form] = Form.useForm();

  const [formModalOpen, setFormModalOpen] =
    useState(false);

  const [editingFeedback, setEditingFeedback] =
    useState(null);

  const [presetTags, setPresetTags] =
    useState([]);

  const [showPresetTags, setShowPresetTags] =
    useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // =====================================================
  // LOAD FEEDBACK
  // =====================================================

  const loadFeedbacks = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getFeedbacks({
        page: pagination.current,
        limit: pagination.pageSize,
      });

      const data =
        response?.data?.feedbacks ??
        response?.data ??
        [];

      setFeedbacks(
        Array.isArray(data)
          ? data
          : [],
      );

      setPagination((previous) => ({
        ...previous,

        total:
          response?.pagination?.total ??
          response?.data?.pagination?.total ??
          0,
      }));
    } catch (error) {
      console.error(
        "Load feedbacks error:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          "Không thể tải danh sách feedback",
      );
    } finally {
      setLoading(false);
    }
  }, [
    pagination.current,
    pagination.pageSize,
  ]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    void loadFeedbacks();
  }, [loadFeedbacks]);

  // =====================================================
  // PRESET TAG PERMISSION
  // =====================================================

  const canUsePresetTags = [
    "premium",
    "admin",
  ].includes(user?.role);

  // =====================================================
  // INSERT PRESET TAG
  // =====================================================

  const handleInsertPresetTag = (label) => {
    const currentContent =
      form.getFieldValue("content") || "";

    const separator =
      currentContent.trim()
        ? ", "
        : "";

    form.setFieldValue(
      "content",
      `${currentContent}${separator}${label}`,
    );
  };

  // =====================================================
  // LOAD PRESET TAGS
  // =====================================================

  useEffect(() => {
    if (!canUsePresetTags) {
      setPresetTags([]);

      return;
    }

    getFeedbackTags()
      .then((response) => {
        setPresetTags(
          Array.isArray(response?.data)
            ? response.data
            : [],
        );
      })
      .catch(() => {
        setPresetTags([]);
      });
  }, [canUsePresetTags]);

  // =====================================================
  // OPEN CREATE
  // =====================================================

  const handleCreate = () => {
    setEditingFeedback(null);

    setShowPresetTags(false);

    form.resetFields();

    form.setFieldsValue({
      dateTime: dayjs(),
    });

    setFormModalOpen(true);
  };

  // =====================================================
  // OPEN EDIT
  // =====================================================

  const handleEdit = (record) => {
    setEditingFeedback(record);

    setShowPresetTags(false);

    form.setFieldsValue({
      customerName:
        record.customerName || "",

      customerPhone:
        record.customerPhone || "",

      tableNumber:
        record.tableNumber || "",

      meal:
        record.meal || undefined,

      tags:
        Array.isArray(record.tags)
          ? record.tags
          : [],

      content:
        record.content || "",

      dateTime:
        record.dateTime
          ? dayjs(record.dateTime)
          : record.createdAt
            ? dayjs(record.createdAt)
            : dayjs(),
    });

    setFormModalOpen(true);
  };

  // =====================================================
  // CLOSE FORM
  // =====================================================

  const handleCloseForm = () => {
    if (saving) return;

    setFormModalOpen(false);

    setEditingFeedback(null);

    form.resetFields();
  };

  // =====================================================
  // SUBMIT CREATE / UPDATE
  // =====================================================

  const handleSubmit = async () => {
    try {
      const values =
        await form.validateFields();

      setSaving(true);

      const payload = {
        customerName:
          values.customerName?.trim() || "",

        customerPhone:
          values.customerPhone?.trim() || "",

        tableNumber:
          values.tableNumber?.trim() || "",

        meal:
          values.meal || "",

        tags:
          Array.isArray(values.tags)
            ? values.tags
            : [],

        content:
          values.content?.trim() || "",

        dateTime:
          values.dateTime
            ? values.dateTime.toISOString()
            : null,
      };

      // =================================================
      // UPDATE
      // =================================================

      if (editingFeedback) {
        await updateFeedback(
          editingFeedback._id,
          payload,
        );

        message.success(
          "Đã cập nhật feedback",
        );
      }

      // =================================================
      // CREATE
      // =================================================

      else {
        await createFeedback(payload);

        message.success(
          "Đã thêm feedback",
        );
      }

      setFormModalOpen(false);

      setEditingFeedback(null);

      form.resetFields();

      await loadFeedbacks();
    } catch (error) {
      // Ant Design validation
      if (error?.errorFields) {
        return;
      }

      console.error(
        "Save feedback error:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          "Không thể lưu feedback",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);

      await deleteFeedback(id);

      message.success(
        "Đã xóa feedback",
      );

      if (
        feedbacks.length === 1 &&
        pagination.current > 1
      ) {
        setPagination(
          (previous) => ({
            ...previous,

            current:
              previous.current - 1,
          }),
        );
      } else {
        await loadFeedbacks();
      }
    } catch (error) {
      console.error(
        "Delete feedback error:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          "Không thể xóa feedback",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (
      !value ||
      !dayjs(value).isValid()
    ) {
      return "—";
    }

    return dayjs(value).format(
      "DD/MM/YYYY HH:mm",
    );
  };

  if (selectedUser) {
    return (
      <EmployeeDetail
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="pb-24 lg:pb-0">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">
            Chăm sóc khách hàng
          </div>

          <h1 className="erp-page-title">
            Phản hồi khách hàng
          </h1>

          <p className="erp-page-description">
            Theo dõi và xử lý các ý kiến
            khách hàng gửi về nhà hàng.
          </p>
        </div>

        <Space wrap>
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

      {/* =================================================
          TABLE
      ================================================= */}

      <Card
        className="
          erp-section-card
          erp-table-card
        "
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
          onUserClick={setSelectedUser}
          onPaginationChange={(
            current,
            pageSize,
          ) =>
            setPagination(
              (previous) => ({
                ...previous,

                current:
                  pageSize !==
                  previous.pageSize
                    ? 1
                    : current,

                pageSize,
              }),
            )
          }
        />
      </Card>

      {/* =================================================
          VIEW MODAL
      ================================================= */}

      <Modal
        title="Chi tiết phản hồi"
        open={Boolean(
          selectedFeedback,
        )}
        onCancel={() =>
          setSelectedFeedback(null)
        }
        footer={
          <Button
            onClick={() =>
              setSelectedFeedback(null)
            }
          >
            Đóng
          </Button>
        }
        width="min(640px, calc(100vw - 16px))"
        className="erp-feedback-view-modal"
        centered={false}
        style={{
          top: 8,
          paddingBottom: 0,
        }}
        zIndex={3000}
        styles={{
          content: {
            padding: 0,

            overflow: "hidden",

            borderRadius: 16,

            maxHeight:
              "calc(100dvh - 16px)",

            display: "flex",

            flexDirection: "column",
          },

          header: {
            flexShrink: 0,

            marginBottom: 0,

            padding:
              "16px 16px 12px",

            borderBottom:
              "1px solid #f1f5f9",
          },

          body: {
            flex: 1,

            minHeight: 0,

            overflowY: "auto",

            overflowX: "hidden",

            padding: 16,

            WebkitOverflowScrolling:
              "touch",

            overscrollBehavior:
              "contain",
          },

          footer: {
            flexShrink: 0,

            marginTop: 0,

            padding:
              "12px 16px max(12px, env(safe-area-inset-bottom))",

            borderTop:
              "1px solid #f1f5f9",

            background: "#fff",
          },
        }}
        maskClosable
        keyboard
      >
        {selectedFeedback && (
          <Descriptions
            column={1}
            size="small"
            bordered
          >
            <Descriptions.Item label="Khách hàng">
              {selectedFeedback.customerName ||
                "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Số điện thoại">
              {selectedFeedback.customerPhone ||
                "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Bàn">
              {selectedFeedback.tableNumber ||
                "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Bữa ăn">
              {selectedFeedback.meal ||
                "—"}
            </Descriptions.Item>

            {Array.isArray(
              selectedFeedback.tags,
            ) &&
              selectedFeedback.tags
                .length > 0 && (
                <Descriptions.Item label="Tags">
                  <div className="flex flex-wrap gap-1">
                    {selectedFeedback.tags.map(
                      (tag) => (
                        <Tag key={tag}>
                          {tag}
                        </Tag>
                      ),
                    )}
                  </div>
                </Descriptions.Item>
              )}

            <Descriptions.Item label="Nội dung">
              <span className="whitespace-pre-wrap">
                {selectedFeedback.content ||
                  "—"}
              </span>
            </Descriptions.Item>

            <Descriptions.Item label="Ngày feedback">
              {formatDate(
                selectedFeedback.dateTime ||
                  selectedFeedback.feedbackDate,
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Thời gian gửi">
              {formatDate(
                selectedFeedback.createdAt,
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật">
              {formatDate(
                selectedFeedback.updatedAt,
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}

      <Modal
        title={
          editingFeedback
            ? "Chỉnh sửa feedback"
            : "Thêm feedback"
        }
        open={formModalOpen}
        onCancel={handleCloseForm}
        onOk={handleSubmit}
        okText={
          editingFeedback
            ? "Lưu thay đổi"
            : "Thêm feedback"
        }
        cancelText="Hủy"
        confirmLoading={saving}
        width="min(760px, calc(100vw - 16px))"
        className="erp-feedback-form-modal"

        // Không centered để mobile keyboard
        // không đẩy modal lung tung
        centered={false}

        style={{
          top: 8,
          paddingBottom: 0,
        }}

        // Cao hơn floating mobile taskbar
        zIndex={3000}

        styles={{
          // ===============================================
          // TOÀN BỘ MODAL
          // ===============================================

          content: {
            padding: 0,

            overflow: "hidden",

            borderRadius: 16,

            // Quan trọng:
            // modal không vượt quá viewport thật
            maxHeight:
              "calc(100dvh - 16px)",

            display: "flex",

            flexDirection: "column",
          },

          // ===============================================
          // HEADER
          // ===============================================

          header: {
            flexShrink: 0,

            marginBottom: 0,

            padding:
              "16px 16px 12px",

            borderBottom:
              "1px solid #f1f5f9",

            background: "#fff",
          },

          // ===============================================
          // BODY
          // ===============================================

          body: {
            flex: 1,

            minHeight: 0,

            // CHỈ BODY SCROLL
            overflowY: "auto",

            overflowX: "hidden",

            padding:
              "0 16px 16px",

            WebkitOverflowScrolling:
              "touch",

            overscrollBehavior:
              "contain",

            touchAction: "pan-y",
          },

          // ===============================================
          // FOOTER
          // ===============================================

          footer: {
            flexShrink: 0,

            marginTop: 0,

            position: "relative",

            zIndex: 20,

            background: "#fff",

            borderTop:
              "1px solid #e2e8f0",

            padding:
              "12px 16px",

            // iPhone home indicator
            paddingBottom:
              "max(12px, env(safe-area-inset-bottom))",

            boxShadow:
              "0 -6px 18px rgba(15, 23, 42, 0.06)",
          },
        }}
        destroyOnHidden
        maskClosable={!saving}
        keyboard={!saving}
      >
        <Form
          form={form}
          layout="vertical"
          className="pt-4"
          requiredMark={false}
        >
          {/* =================================================
              BASIC INFO
          ================================================= */}

          <div className="grid grid-cols-1 gap-x-5 md:grid-cols-2">
            {/* CUSTOMER */}

            <Form.Item
              label="Tên khách hàng"
              name="customerName"
            >
              <Input
                placeholder="Nhập tên khách hàng"
                size="large"
                autoComplete="off"
              />
            </Form.Item>

            {/* PHONE */}

            <Form.Item
              label="Số điện thoại"
              name="customerPhone"
            >
              <Input
                placeholder="Nhập số điện thoại"
                size="large"
                inputMode="tel"
                autoComplete="tel"
              />
            </Form.Item>

            <div className="grid grid-cols-2 gap-x-3 md:contents">
              {/* TABLE */}

              <Form.Item
                label="Số bàn"
                name="tableNumber"
              >
                <Input
                  placeholder="Ví dụ: A12"
                  size="large"
                  autoComplete="off"
                />
              </Form.Item>

              {/* MEAL */}

              <Form.Item
                label="Bữa ăn"
                name="meal"
              >
                <AutoComplete
                  size="large"
                  placeholder="Nhập món, ví dụ: Yakiuo x2"
                  style={{ width: "100%" }}
                  filterOption={(inputValue, option) =>
                    option?.value
                      ?.toUpperCase()
                      .includes(inputValue.toUpperCase())
                  }
                  options={[
                  {
                    label: "Alacarte",
                    value: "Alacarte",
                  },

                  {
                    label: "Abalon",
                    value: "Abalon",
                  },

                  {
                    label: "Saigon",
                    value: "Saigon",
                  },

                  {
                    label: "San",
                    value: "San",
                  },

                  {
                    label: "Saikyo",
                    value: "Saikyo",
                  },

                  {
                    label: "Umami",
                    value: "Umami",
                  },

                  {
                    label: "Yakiuo",
                    value: "Yakiuo",
                  },
                  ]}
                />
              </Form.Item>
            </div>

            {/* DATE */}

            <Form.Item
              label="Ngày feedback"
              name="dateTime"
              rules={[
                {
                  required: true,

                  message:
                    "Vui lòng chọn ngày feedback",
                },
              ]}
            >
              <DatePicker
                size="large"
                style={{
                  width: "100%",
                }}
                format="DD/MM/YYYY"
                placeholder="Chọn ngày feedback"
                allowClear={false}
                inputReadOnly
              />
            </Form.Item>
          </div>

          {/* =================================================
              PRESET TAG
          ================================================= */}

          {canUsePresetTags &&
            presetTags.length >
              0 && (
              <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-purple-700"
                  onClick={() => setShowPresetTags((visible) => !visible)}
                  aria-expanded={showPresetTags}
                >
                  <span>Nhãn gợi ý Premium ({presetTags.length})</span>
                  <span>{showPresetTags ? "Thu gọn" : "Chạm để mở"}</span>
                </button>

                {showPresetTags && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {presetTags.map(
                      (tag) => (
                      <button
                        key={tag._id}
                        type="button"
                        onClick={() =>
                          handleInsertPresetTag(
                            tag.label,
                          )
                        }
                        className="
                          rounded-full
                          border
                          border-purple-200
                          bg-white
                          px-3
                          py-1.5
                          text-xs
                          font-medium
                          text-purple-700
                          transition
                          active:scale-95
                          hover:bg-purple-100
                        "
                      >
                        {tag.label}
                      </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

          {/* =================================================
              CONTENT
          ================================================= */}

          <Form.Item
            label="Nội dung feedback"
            name="content"
            rules={[
              {
                required: true,

                message:
                  "Vui lòng nhập nội dung feedback",
              },
            ]}
          >
            <Input.TextArea
              placeholder="Nhập nội dung phản hồi..."
              rows={3}
              showCount
              maxLength={2000}
              style={{
                resize: "none",
              }}
            />
          </Form.Item>

          {/* Khoảng an toàn cuối form */}
          <div
            aria-hidden
            className="h-2"
          />
        </Form>
      </Modal>
    </div>
  );
};

export default Feedback;
