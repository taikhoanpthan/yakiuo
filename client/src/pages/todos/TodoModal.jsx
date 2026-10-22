import { Form, Input, Modal, Select, Tag } from "antd";

const QUICK_TASK_TAGS = [
  "Lau kệ inox T/C",
  "Chà lò",
  "Dọn bàn",
  "Fill dĩa",
];

const TodoModal = ({ open, editingTodo, loading, onClose, onSubmit }) => {
  const [form] = Form.useForm();
  const description = Form.useWatch("description", form) || "";
  const draftKey = editingTodo?._id
    ? `yakiuo:todo-draft:edit:${editingTodo._id}`
    : "yakiuo:todo-draft:create";

  const getDraft = () => {
    try {
      const draft = sessionStorage.getItem(draftKey);
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  };

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // Storage có thể bị trình duyệt chặn; form vẫn hoạt động bình thường.
    }
  };

  const toggleQuickTask = (task, checked) => {
    const lines = description
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const nextLines = checked
      ? [...new Set([...lines, task])]
      : lines.filter((line) => line !== task);

    form.setFieldValue("description", nextLines.join("\n"));
  };

  const handleSubmit = async (values) => {
    const saved = await onSubmit({
      description: values.description?.trim() || "",
      priority: values.priority,
      assignedShift: values.assignedShift,
    });

    if (saved) clearDraft();
  };

  return (
    <Modal
      open={open}
      title={editingTodo ? "Chỉnh sửa công việc" : "Giao công việc"}
      okText={editingTodo ? "Lưu thay đổi" : "Giao công việc"}
      cancelText="Hủy"
      confirmLoading={loading}
      // Tránh đóng nhầm khi chạm ra ngoài; chỉ nút Hủy mới bỏ dữ liệu.
      closable={false}
      maskClosable={false}
      keyboard={false}
      onCancel={() => {
        clearDraft();
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
      afterOpenChange={(visible) => {
        if (visible) {
          const draft = getDraft();
          form.setFieldsValue({
            description: draft?.description ?? editingTodo?.description ?? "",
            priority: draft?.priority ?? editingTodo?.priority ?? "normal",
            assignedShift: draft?.assignedShift ?? editingTodo?.assignedShift ?? "afternoon",
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
        onValuesChange={(_, values) => {
          try {
            sessionStorage.setItem(draftKey, JSON.stringify(values));
          } catch {
            // Storage có thể bị trình duyệt chặn; form vẫn hoạt động bình thường.
          }
        }}
      >
        <Form.Item label="Việc làm nhanh" className="mb-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_TASK_TAGS.map((task) => (
              <Tag.CheckableTag
                key={task}
                className="!m-0 !rounded-md !border !border-slate-300 !px-2.5 !py-1 dark:!border-slate-600"
                checked={description.split("\n").map((line) => line.trim()).includes(task)}
                onChange={(checked) => toggleQuickTask(task, checked)}
              >
                {task}
              </Tag.CheckableTag>
            ))}
          </div>
        </Form.Item>

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
            autoSize={false}
            style={{
              maxHeight: 160,
              overflowY: "auto",
            }}
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
