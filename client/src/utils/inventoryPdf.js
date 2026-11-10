import { jsPDF } from "jspdf";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const PAGE_PADDING = 32;
const ROW_HEIGHT = 27;
const ROWS_PER_PAGE = 15;

const statusLabel = (item) => {
  if (item.quantity <= 0) return "Hết hàng";
  if (item.quantity <= (item.minQuantity ?? 5)) return "Sắp hết";
  return "Còn hàng";
};

const statusColor = (status) => {
  if (status === "Hết hàng") return "#ad5a4c";
  if (status === "Sắp hết") return "#a66b2f";
  return "#4f7854";
};

const truncate = (context, value, maxWidth) => {
  const text = String(value || "-");
  if (context.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result && context.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
};

const formatDate = (value) => {
  if (!value) return "Chưa kiểm kê";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const drawText = (context, text, x, y, options = {}) => {
  const {
    color = "#3f3025",
    font = "400 9px Arial",
    align = "left",
    maxWidth,
  } = options;
  context.fillStyle = color;
  context.font = font;
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillText(maxWidth ? truncate(context, text, maxWidth) : text, x, y);
};

const createPageCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * 2;
  canvas.height = PAGE_HEIGHT * 2;
  const context = canvas.getContext("2d");
  context.scale(2, 2);
  return { canvas, context };
};

export const downloadInventoryMonthlyPdf = async ({ items, month }) => {
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T12:00:00`));
  const generatedAt = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const lowStockCount = items.filter((item) => item.quantity > 0 && item.quantity <= (item.minQuantity ?? 5)).length;
  const outOfStockCount = items.filter((item) => item.quantity <= 0).length;
  const pageCount = Math.max(1, Math.ceil(items.length / ROWS_PER_PAGE));
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage("a4", "landscape");

    const { canvas, context } = createPageCanvas();
    const pageItems = items.slice(pageIndex * ROWS_PER_PAGE, (pageIndex + 1) * ROWS_PER_PAGE);

    context.fillStyle = "#fffdfa";
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    context.fillStyle = "#2b211b";
    context.fillRect(0, 0, PAGE_WIDTH, 78);
    drawText(context, "YAKIUO ISHIKAWA", PAGE_PADDING, 28, { color: "#ddc4a8", font: "700 9px Arial" });
    drawText(context, "BÁO CÁO KIỂM KÊ HÀNG HÓA", PAGE_PADDING, 51, { color: "#fffaf5", font: "700 18px Arial" });
    drawText(context, monthLabel, PAGE_WIDTH - PAGE_PADDING, 51, { color: "#dfc8b0", font: "400 10px Arial", align: "right" });

    const summary = [
      `Mặt hàng: ${items.length}`,
      `Tổng tồn: ${totalQuantity}`,
      `Sắp hết: ${lowStockCount}`,
      `Hết hàng: ${outOfStockCount}`,
    ];
    let summaryX = PAGE_PADDING;
    summary.forEach((text, index) => {
      const width = [132, 130, 118, 112][index];
      context.fillStyle = index === 2 ? "#fff6e8" : index === 3 ? "#fbeeed" : "#f6eee5";
      context.fillRect(summaryX, 94, width, 26);
      drawText(context, text, summaryX + 10, 107, { color: "#634c3a", font: "600 9px Arial" });
      summaryX += width + 8;
    });

    const columns = [
      ["STT", 34, 31], ["Tên hàng hóa", 70, 164], ["Đơn vị", 244, 64],
      ["SL tồn", 318, 58], ["Tối thiểu", 386, 67], ["Trạng thái", 463, 92],
      ["Vị trí", 565, 123], ["Kiểm kê gần nhất", 698, 112],
    ];
    const tableTop = 140;
    context.fillStyle = "#f2e9df";
    context.fillRect(PAGE_PADDING, tableTop, PAGE_WIDTH - PAGE_PADDING * 2, 25);
    columns.forEach(([label, x]) => drawText(context, label, x, tableTop + 13, { color: "#715a47", font: "700 8px Arial" }));

    pageItems.forEach((item, index) => {
      const y = tableTop + 25 + index * ROW_HEIGHT;
      context.fillStyle = index % 2 ? "#fcf8f3" : "#fffdfa";
      context.fillRect(PAGE_PADDING, y, PAGE_WIDTH - PAGE_PADDING * 2, ROW_HEIGHT);
      context.strokeStyle = "#eee3d7";
      context.beginPath();
      context.moveTo(PAGE_PADDING, y + ROW_HEIGHT);
      context.lineTo(PAGE_WIDTH - PAGE_PADDING, y + ROW_HEIGHT);
      context.stroke();

      const status = statusLabel(item);
      drawText(context, pageIndex * ROWS_PER_PAGE + index + 1, 34, y + ROW_HEIGHT / 2, { color: "#877362", font: "400 8px Arial" });
      drawText(context, item.name, 70, y + ROW_HEIGHT / 2, { font: "600 9px Arial", maxWidth: 158 });
      drawText(context, item.unit || "cái", 244, y + ROW_HEIGHT / 2, { color: "#705c4b", maxWidth: 60 });
      drawText(context, item.quantity ?? 0, 318, y + ROW_HEIGHT / 2, { font: "600 9px Arial" });
      drawText(context, item.minQuantity ?? 5, 386, y + ROW_HEIGHT / 2, { color: "#a66b2f" });
      drawText(context, status, 463, y + ROW_HEIGHT / 2, { color: statusColor(status), font: "600 9px Arial", maxWidth: 88 });
      drawText(context, item.location || "-", 565, y + ROW_HEIGHT / 2, { color: "#705c4b", maxWidth: 121 });
      drawText(context, formatDate(item.lastCheckedAt), 698, y + ROW_HEIGHT / 2, { color: "#705c4b", maxWidth: 110 });
    });

    context.strokeStyle = "#e4d8ca";
    context.beginPath();
    context.moveTo(PAGE_PADDING, PAGE_HEIGHT - 37);
    context.lineTo(PAGE_WIDTH - PAGE_PADDING, PAGE_HEIGHT - 37);
    context.stroke();
    drawText(context, `Xuất lúc ${generatedAt}`, PAGE_PADDING, PAGE_HEIGHT - 20, { color: "#927c69", font: "400 8px Arial" });
    drawText(context, `Trang ${pageIndex + 1}/${pageCount}`, PAGE_WIDTH - PAGE_PADDING, PAGE_HEIGHT - 20, { color: "#927c69", font: "400 8px Arial", align: "right" });

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, "FAST");
  }

  pdf.save(`bao-cao-kiem-ke-${month}.pdf`);
};
