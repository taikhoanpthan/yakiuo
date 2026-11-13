import { useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Modal,
  Upload,
  Button,
  message,
  Row,
  Col,
  Divider,
} from "antd";
import {
  UploadOutlined,
  PictureOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  createInventoryItem,
  updateInventoryItem,
  uploadInventoryImage,
} from "../../services/inventory.service";

const InventoryModal = ({ open, onClose, onSuccess, editingItem = null }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const isEdit = Boolean(editingItem);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setImageUrl("");
      return;
    }

    if (editingItem) {
      form.setFieldsValue({
        name: editingItem.name || "",
        unit: editingItem.unit || "cái",
        minQuantity: editingItem.minQuantity ?? 5,
        location: editingItem.location || "",
        imageUrlInput: editingItem.image || "",
      });
      setImageUrl(editingItem.image || "");
    } else {
      form.resetFields();
      form.setFieldsValue({
        quantity: 1,
        unit: "cái",
        minQuantity: 5,
        location: "",
      });
      setImageUrl("");
    }
  }, [open, editingItem, form]);

  const handleCustomUpload = async ({ file, onSuccess: uploadSuccess, onError }) => {
    try {
      setUploadingImage(true);
      const res = await uploadInventoryImage(file);
      const uploadedUrl = res.data?.url || "";
      setImageUrl(uploadedUrl);
      form.setFieldsValue({ imageUrlInput: uploadedUrl });
      message.success("Tải ảnh lên thành công");
      uploadSuccess(res, file);
    } catch (err) {
      console.error("Upload error:", err);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target.result);
      };
      reader.readAsDataURL(file);
      message.info("Đã chọn ảnh xem trước");
      if (onError) onError(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUrlInputChange = (e) => {
    const val = e.target.value.trim();
    setImageUrl(val);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    form.setFieldsValue({ imageUrlInput: "" });
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);

      const payload = {
        name: values.name.trim(),
        unit: values.unit.trim(),
        minQuantity: Number(values.minQuantity) || 5,
        location: values.location ? values.location.trim() : "",
        image: imageUrl || values.imageUrlInput || "",
      };

      if (isEdit) {
        await updateInventoryItem(editingItem._id, payload);
        message.success("Cập nhật hàng hóa thành công");
      } else {
        payload.quantity = Number(values.quantity) || 0;
        await createInventoryItem(payload);
        message.success("Thêm hàng hóa mới thành công");
      }

      form.resetFields();
      setImageUrl("");
      await onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Save inventory item failed:", error);
      message.error(error.response?.data?.message || "Không thể lưu thông tin hàng hóa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ fontSize: 17, fontWeight: 700 }}>
          {isEdit ? "✏️ Chỉnh sửa hàng hóa" : "📦 Thêm hàng hóa mới"}
        </div>
      }
      okText={isEdit ? "Cập nhật" : "Thêm mới"}
      cancelText="Hủy"
      confirmLoading={submitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      className="inventory-responsive-modal"
      width="min(540px, calc(100vw - 20px))"
      centered
      destroyOnClose
      styles={{
        body: {
          maxHeight: "calc(100dvh - 160px)",
          overflowY: "auto",
          padding: "12px 2px 18px 2px",
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        {/* 1. TÊN HÀNG HÓA */}
        <Form.Item
          label="Tên hàng hóa / công cụ"
          name="name"
          rules={[
            { required: true, message: "Vui lòng nhập tên hàng hóa" },
            { max: 120, message: "Tên không quá 120 ký tự" },
          ]}
        >
          <Input
            placeholder="Ví dụ: Chảo gang chống dính, Dao sashimi, Ly rock..."
            size="large"
          />
        </Form.Item>

        {/* 2. SỐ LƯỢNG, ĐƠN VỊ & MỨC CẢNH BÁO */}
        <Row gutter={14}>
          {!isEdit && (
          <Col xs={24} sm={12}>
            <Form.Item
              label="Số lượng ban đầu"
              name="quantity"
              rules={[
                { required: true, message: "Vui lòng nhập số lượng" },
                {
                  type: "number",
                  min: 0,
                  message: "Số lượng không được âm",
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                size="large"
                min={0}
                placeholder="Nhập số lượng (vd: 10)"
              />
            </Form.Item>
          </Col>
          )}

          <Col xs={24} sm={isEdit ? 24 : 12}>
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

        </Row>

        <Form.Item
          label="Mức tồn tối thiểu"
          name="minQuantity"
          tooltip="Khi số lượng thực tế bằng hoặc nhỏ hơn số này, hệ thống sẽ tự động bật cảnh báo Sắp hết hàng."
          style={{ maxWidth: 250 }}
        >
          <InputNumber
            style={{ width: "100%" }}
            size="large"
            min={0}
            placeholder="Mặc định: 5"
          />
        </Form.Item>

        {/* 3. VỊ TRÍ Ở ĐÂU */}
        <Form.Item
          label="Vị trí ở đâu"
          name="location"
        >
          <Input
            size="large"
            placeholder="Ví dụ: Kho tầng 2 - Kệ B3, Tủ quầy Bar, Tủ bếp line nướng..."
          />
        </Form.Item>

        <Divider style={{ margin: "14px 0" }}>Hình ảnh hàng hóa</Divider>

        {/* 4. ẢNH HÀNG HÓA */}
        <div style={{ marginBottom: 12 }}>
          {imageUrl ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 10,
                borderRadius: 10,
                border: "1px dashed #d9d9d9",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <img
                src={imageUrl}
                alt="Preview"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #eee",
                }}
                onError={(e) => {
                  e.target.src = "https://placehold.co/100x100?text=No+Image";
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 4 }}>
                  Ảnh hàng hóa đã chọn
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#888",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginBottom: 8,
                  }}
                >
                  {imageUrl.startsWith("data:") ? "Ảnh tải từ máy tính" : imageUrl}
                </div>
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={handleRemoveImage}
                >
                  Xóa ảnh
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Upload
                customRequest={handleCustomUpload}
                showUploadList={false}
                accept="image/*"
                maxCount={1}
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={uploadingImage}
                  size="large"
                  style={{ width: "100%" }}
                >
                  {uploadingImage ? "Đang tải ảnh lên..." : "Tải ảnh từ máy / điện thoại"}
                </Button>
              </Upload>

              <div style={{ textAlign: "center", fontSize: 12, color: "#888" }}>
                — hoặc dán link ảnh trực tiếp —
              </div>

              <Form.Item name="imageUrlInput" noStyle>
                <Input
                  prefix={<PictureOutlined style={{ color: "#aaa" }} />}
                  placeholder="https://example.com/anh-hang-hoa.jpg"
                  onChange={handleUrlInputChange}
                  allowClear
                />
              </Form.Item>
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default InventoryModal;
