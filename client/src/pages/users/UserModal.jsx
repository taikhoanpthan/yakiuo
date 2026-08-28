import { useEffect } from "react";
import { Form, Input, Modal, Select, message } from "antd";

import { createUser, updateUser } from "../../services/user.service";

const UserModal = ({ open, onClose, onSuccess, editingUser = null }) => {
  const [form] = Form.useForm();

  const isEdit = !!editingUser;

  useEffect(() => {
    if (!open) return;

    if (editingUser) {
      form.setFieldsValue({
        username: editingUser.username,
        email: editingUser.email || "",
        fullName: editingUser.fullName || "",
        phone: editingUser.phone || "",
        role: editingUser.role,
      });
    } else {
      form.resetFields();

      form.setFieldsValue({
        role: "employee",
      });
    }
  }, [open, editingUser, form]);

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        const data = {
          username: values.username,
          email: values.email,
          fullName: values.fullName,
          phone: values.phone,
          role: values.role,
        };

        // Chỉ gửi password nếu admin nhập mật khẩu mới
        if (values.password?.trim()) {
          data.password = values.password.trim();
        }

        await updateUser(editingUser._id, data);

        message.success("Cập nhật nhân viên thành công");
      } else {
        await createUser({
          username: values.username,
          email: values.email,
          password: values.password,
          fullName: values.fullName,
          phone: values.phone,
          role: values.role,
        });

        message.success("Tạo nhân viên thành công");
      }

      form.resetFields();

      await onSuccess();

      onClose();
    } catch (error) {
      console.error("Save user failed:", error);

      message.error(
        error.response?.data?.message || "Không thể lưu thông tin nhân viên",
      );
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Chỉnh sửa nhân viên" : "Thêm nhân viên"}
      okText={isEdit ? "Cập nhật" : "Tạo nhân viên"}
      cancelText="Hủy"
      centered
      destroyOnClose
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* HỌ TÊN */}
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[
            {
              required: true,
              message: "Vui lòng nhập họ và tên",
            },
          ]}
        >
          <Input placeholder="Nguyễn Văn A" />
        </Form.Item>

        {/* USERNAME */}
        <Form.Item
          label="Tên đăng nhập"
          name="username"
          rules={[
            {
              required: true,
              message: "Vui lòng nhập username",
            },
          ]}
        >
          <Input placeholder="employee01" />
        </Form.Item>

        {/* EMAIL */}
        <Form.Item
          label="Email"
          name="email"
          rules={[
            {
              type: "email",
              message: "Email không hợp lệ",
            },
          ]}
        >
          <Input placeholder="employee@yakiuo.com" />
        </Form.Item>

        {/* PASSWORD */}
        <Form.Item
          label={isEdit ? "Mật khẩu mới" : "Mật khẩu"}
          name="password"
          rules={
            isEdit
              ? [
                  {
                    min: 8,
                    message: "Mật khẩu tối thiểu 8 ký tự",
                  },
                ]
              : [
                  {
                    required: true,
                    message: "Vui lòng nhập mật khẩu",
                  },
                  {
                    min: 8,
                    message: "Mật khẩu tối thiểu 8 ký tự",
                  },
                ]
          }
        >
          <Input.Password
            placeholder={isEdit ? "Để trống nếu không đổi" : "Nhập mật khẩu"}
          />
        </Form.Item>

        {/* PHONE + ROLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="0900000000" />
          </Form.Item>

          <Form.Item
            label="Vai trò"
            name="role"
            rules={[
              {
                required: true,
                message: "Vui lòng chọn vai trò",
              },
            ]}
          >
            <Select
              options={[
                {
                  value: "employee",
                  label: "Employee",
                },
                {
                  value: "premium",
                  label: "Premium",
                },
                {
                  value: "manager",
                  label: "Manager",
                },
                {
                  value: "admin",
                  label: "Admin",
                },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default UserModal;
