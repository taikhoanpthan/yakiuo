import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Row,
  Col,
  Alert,
  message,
} from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import { checkInventoryItem } from "../../services/inventory.service";

const InventoryCheckModal = ({ open, onClose, onSuccess, item = null }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [currentActual, setCurrentActual] = useState(0);

  useEffect(() => {
    if (!open || !item) {
      form.resetFields();
      return;
    }
    const qty = item.quantity ?? 0;
    setCurrentActual(qty);
    form.setFieldsValue({
      actualQuantity: qty,
      unit: item.unit || "cái",
      minQuantity: item.minQuantity ?? 5,
      notes: "",
    });
  }, [open, item, form]);

  if (!item) return null;

  const diff = currentActual - (item.quantity ?? 0);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await checkInventoryItem(item._id, {
        actualQuantity: values.actualQuantity,
        unit: values.unit.trim(),
        minQuantity: Number(values.minQuantity),
        notes: values.notes ? values.notes.trim() : item.notes,
      });
      message.success(`Đã cập nhật kiểm kê cho "${item.name}"`);
      await onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Check inventory failed:", error);
      message.error(error.response?.data?.message || "Không thể lưu kiểm kê");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 700 }}>
          <CheckCircleOutlined style={{ color: "#52c41a" }} />
          <span>Kiểm kê số lượng thực tế</span>
        </div>
      }
      okText="Xác nhận kiểm kê"
      cancelText="Đóng"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      className="inventory-responsive-modal"
      width="min(480px, calc(100vw - 20px))"
      centered
      destroyOnClose
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          padding: 12,
          borderRadius: 12,
          background: "rgba(0,0,0,0.03)",
          marginBottom: 16,
        }}
      >
        <img
          src={item.image || "https://placehold.co/80x80?text=No+Img"}
          alt={item.name}
          style={{
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #e0e0e0",
          }}
          onError={(e) => {
            e.target.src = "https://placehold.co/80x80?text=No+Img";
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{item.name}</div>
          {item.location && (
            <div style={{ fontSize: 12, color: "#666" }}>📍 {item.location}</div>
          )}
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            Hệ thống ghi nhận: <strong style={{ color: "#1890ff" }}>{item.quantity} {item.unit || "cái"}</strong>
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Đơn vị"
              name="unit"
              rules={[
                { required: true, whitespace: true, message: "Vui lòng nhập đơn vị" },
                { max: 30, message: "Đơn vị không quá 30 ký tự" },
              ]}
            >
              <Input size="large" placeholder="Ví dụ: cái, chai, kg" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Mức tối thiểu"
              name="minQuantity"
              rules={[{ required: true, message: "Vui lòng nhập mức tối thiểu" }]}
            >
              <InputNumber size="large" min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Số lượng thực tế bạn kiểm kê được"
          name="actualQuantity"
          rules={[
            { required: true, message: "Vui lòng nhập số lượng kiểm kê" },
            { type: "number", min: 0, message: "Số lượng không được nhỏ hơn 0" },
          ]}
        >
          <InputNumber
            size="large"
            style={{ width: "100%" }}
            min={0}
            onChange={(val) => setCurrentActual(Number(val) || 0)}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          {diff === 0 ? (
            <Alert
              type="success"
              showIcon
              message={`Khớp số lượng: Thực tế có đúng ${currentActual}.`}
            />
          ) : diff < 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`Chênh lệch hao hụt: Thiếu ${Math.abs(diff)} so với ghi nhận hệ thống.`}
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message={`Chênh lệch dôi dư: Thừa ${diff} so với ghi nhận hệ thống.`}
            />
          )}
        </div>

        <Form.Item label="Ghi chú khi kiểm kê (Tùy chọn)" name="notes">
          <Input.TextArea
            rows={2}
            placeholder="Ghi chú thêm nếu có..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InventoryCheckModal;
