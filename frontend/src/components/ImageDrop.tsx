// src/components/ImageDrop.tsx
import { useState } from "react";

type Props = {
  onFileSelect: (file: File | null) => void;
};

export default function ImageDrop({ onFileSelect }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="block cursor-pointer">
        {preview ? (
          <img
            src={preview}
            alt="preview"
            className="mx-auto max-h-40 object-contain"
          />
        ) : (
          <span className="text-gray-500">Drag & drop or click to upload</span>
        )}
      </label>
    </div>
  );
}