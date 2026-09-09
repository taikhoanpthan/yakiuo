import { useCallback, useEffect, useState } from "react";
import { Button, Empty, Image, Popconfirm, Tabs, message } from "antd";
import { DeleteOutlined, ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { clearTrash, getMyTrash, restoreTrashItem } from "../../services/trash.service";

const TrashBin = () => {
  const [trash, setTrash] = useState({ ggImages: [], commissions: [] });
  const [loading, setLoading] = useState(false);
  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyTrash();
      setTrash(response.data?.data || { ggImages: [], commissions: [] });
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tải thùng rác");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadTrash(); }, [loadTrash]);
  const restore = async (type, id) => {
    try {
      await restoreTrashItem(type, id);
      await loadTrash();
      message.success("Đã khôi phục");
    } catch (error) { message.error(error.response?.data?.message || "Không thể khôi phục"); }
  };
  const clear = async (type) => {
    try {
      const response = await clearTrash(type);
      await loadTrash();
      message.success(response.data?.message || "Đã xóa vĩnh viễn");
    } catch (error) { message.error(error.response?.data?.message || "Không thể xóa"); }
  };
  const renderHeader = (type, count) => (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">Tự xóa vĩnh viễn sau 15 ngày.</span>
      <Popconfirm title="Xóa vĩnh viễn tất cả mục này?" description="Thao tác này không thể khôi phục." okText="Xóa tất cả" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => clear(type)} disabled={!count}>
        <Button size="small" danger icon={<DeleteOutlined />} disabled={!count}>Xóa tất cả</Button>
      </Popconfirm>
    </div>
  );
  return (
    <div className="yakiuo-social-card mt-5 p-5">
      <div className="yakiuo-card-heading">
        <div><div className="yakiuo-card-title">Thùng rác</div><div className="yakiuo-card-subtitle">Khôi phục dữ liệu đã xóa trong 15 ngày.</div></div>
        <Button type="text" icon={<ReloadOutlined />} loading={loading} onClick={loadTrash} />
      </div>
      <Tabs items={[
        { key: "gg", label: `Ảnh GG (${trash.ggImages.length})`, children: <>{renderHeader("gg", trash.ggImages.length)}{trash.ggImages.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{trash.ggImages.map((item) => <div className="relative" key={item._id}><Image src={item.imageUrl} alt="Ảnh GG trong thùng rác" className="aspect-square overflow-hidden rounded-xl object-cover opacity-70" /><Button className="absolute bottom-2 left-2" size="small" icon={<UndoOutlined />} onClick={() => restore("gg", item._id)}>Khôi phục</Button></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có ảnh GG trong thùng rác" />}</> },
        { key: "commission", label: `Rượu / Bào ngư (${trash.commissions.length})`, children: <>{renderHeader("commission", trash.commissions.length)}{trash.commissions.length ? <div className="grid gap-2">{trash.commissions.map((item) => <div key={item._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><b>{item.type === "wine" ? "🍷 Rượu" : "🦪 Bào ngư"}</b><div className="mt-1 text-xs text-slate-500">Bàn {item.tableNumber} · {dayjs(item.date).format("DD/MM/YYYY")}</div></div><Button size="small" icon={<UndoOutlined />} onClick={() => restore("commission", item._id)}>Khôi phục</Button></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có commission trong thùng rác" />}</> },
      ]} />
    </div>
  );
};

export default TrashBin;
