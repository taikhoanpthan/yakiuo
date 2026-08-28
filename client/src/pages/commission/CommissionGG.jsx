import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Empty, Image, Popconfirm, Spin, Upload, message } from "antd";
import { CloudUploadOutlined, DeleteOutlined, FolderOpenOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  deleteMyCommissionGGImagesByMonth,
  getMyCommissionGGImages,
  uploadCommissionGGImages,
} from "../../services/commissionGG.service";

const CommissionGG = () => {
  const [month, setMonth] = useState(dayjs());
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const monthKey = month.format("YYYY-MM");

  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyCommissionGGImages(monthKey);
      setImages(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể tải ảnh Commission GG");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleUpload = async ({ file, onSuccess, onError }) => {
    try {
      if (!file.type?.startsWith("image/")) throw new Error("Chỉ được chọn ảnh");
      if (file.size > 5 * 1024 * 1024) throw new Error("Mỗi ảnh tối đa 5MB");

      setUploading(true);
      const response = await uploadCommissionGGImages(monthKey, [file]);
      setImages((prev) => [...(response?.data || []), ...prev]);
      message.success("Đã thêm ảnh Commission GG");
      onSuccess?.(response);
    } catch (error) {
      message.error(error?.response?.data?.message || error.message || "Không thể tải ảnh lên");
      onError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      const response = await deleteMyCommissionGGImagesByMonth(monthKey);
      setImages([]);
      message.success(response?.message || "Đã xóa toàn bộ ảnh");
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể xóa ảnh");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card bordered={false} className="yakiuo-social-card">
      <div className="yakiuo-card-heading">
        <div className="flex items-center gap-3">
          <div className="yakiuo-small-icon"><FolderOpenOutlined /></div>
          <div>
            <div className="yakiuo-card-title">Commission GG</div>
            <div className="yakiuo-card-subtitle">Lưu ảnh đối soát và quản lý theo tháng.</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DatePicker picker="month" value={month} onChange={(value) => setMonth(value || dayjs())} format="MM/YYYY" allowClear={false} />
        <div className="flex gap-2">
          <Upload multiple showUploadList={false} accept="image/png,image/jpeg,image/webp" customRequest={handleUpload} disabled={uploading}>
            <Button type="primary" icon={<CloudUploadOutlined />} loading={uploading}>Thêm ảnh</Button>
          </Upload>
          <Popconfirm
            title={`Xóa toàn bộ ${images.length} ảnh?`}
            description={`Ảnh Commission GG tháng ${month.format("MM/YYYY")} sẽ bị xóa vĩnh viễn.`}
            okText="Xóa tất cả"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={!images.length}
            onConfirm={handleDeleteAll}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!images.length} loading={deleting}>Xóa tất cả</Button>
          </Popconfirm>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-500">{images.length} ảnh trong tháng {month.format("MM/YYYY")}</div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spin /></div>
      ) : images.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <Image key={image._id} src={image.imageUrl} alt="Commission GG" className="aspect-square overflow-hidden rounded-xl object-cover" />
          ))}
        </div>
      ) : (
        <div className="mt-4"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có ảnh Commission GG trong tháng này" /></div>
      )}
    </Card>
  );
};

export default CommissionGG;
