const MAX_EDGE = 1600;
const MAX_DATA_URL_LENGTH = 4_000_000;

export async function resizeNoticeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("사진 파일을 골라 주세요.");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 처리할 수 없어요.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.8, 0.65, 0.5]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    }
    throw new Error("사진이 너무 커요. 조금 더 가까이서 다시 찍어 주세요.");
  } finally {
    bitmap.close();
  }
}
