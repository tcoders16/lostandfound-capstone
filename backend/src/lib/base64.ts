// src/lib/base64.ts (frontend)
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result as string;
      // strip "data:image/...;base64," prefix
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}