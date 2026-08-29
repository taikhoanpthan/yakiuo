export const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const saveImageToPhotos = async (imageUrl, filename = "commission-gg.jpg") => {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Không thể tải ảnh");

  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Lưu ảnh" });
    return;
  }

  downloadFile(blob, filename);
};
