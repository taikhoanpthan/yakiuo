const getExtension = (blob, url) => {
  const fromType = blob?.type?.split("/")[1];
  if (fromType) return fromType.replace("jpeg", "jpg");

  const fromUrl = url?.split("?")[0]?.match(/\.([a-z0-9]+)$/i)?.[1];
  return fromUrl || "jpg";
};

export const downloadImages = async (images, filenamePrefix) => {
  for (const [index, image] of images.entries()) {
    const response = await fetch(image.imageUrl);
    if (!response.ok) throw new Error("Không thể tải một trong các ảnh");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filenamePrefix}-${String(index + 1).padStart(2, "0")}.${getExtension(blob, image.imageUrl)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
};
