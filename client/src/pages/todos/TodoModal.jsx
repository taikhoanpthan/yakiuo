import { Form, Input, Modal, Select } from "antd";

const TodoModal = ({
  open,
  editingTodo,
  loading,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    onSubmit({
      description: values.description?.trim() || "",
      priority: values.priority,
      assignedShift: values.assignedShift,
    });
  };

  return (
    <Modal
      open={open}
      title={editingTodo ? "Chỉnh sửa công việc" : "Giao công việc"}
      okText={editingTodo ? "Lưu thay đổi" : "Giao công việc"}
      cancelText="Hủy"
      confirmLoading={loading}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
      afterOpenChange={(visible) => {
        if (visible) {
          form.setFieldsValue({
            description: editingTodo?.description || "",
            priority: editingTodo?.priority || "normal",
            assignedShift: editingTodo?.assignedShift || "afternoon",
          });
        } else {
          form.resetFields();
        }
      }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Công việc"
          name="description"
          rules={[
            {
              required: true,
              message: "Vui lòng nhập công việc",
            },
          ]}
        >
          <Input.TextArea
            rows={5}
            showCount
            maxLength={1000}
            placeholder="Ví dụ: Kiểm tra toàn bộ bàn khu A, bổ sung khăn giấy và setup lại bàn..."
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Item
            label="Mức độ ưu tiên"
            name="priority"
            rules={[
              {
                required: true,
                message: "Vui lòng chọn mức độ ưu tiên",
              },
            ]}
          >
            <Select
              size="large"
              options={[
                {
                  value: "low",
                  label: "Thấp",
                },
                {
                  value: "normal",
                  label: "Bình thường",
                },
                {
                  value: "high",
                  label: "Cao",
                },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Ca thực hiện"
            name="assignedShift"
            rules={[
              {
                required: true,
                message: "Vui lòng chọn ca",
              },
            ]}
          >
            <Select
              size="large"
              options={[
                {
                  value: "morning",
                  label: "Ca sáng",
                },
                {
                  value: "afternoon",
                  label: "Ca chiều",
                },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default TodoModal;