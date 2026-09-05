"use client";

import React, { useState, useRef } from "react";
import { Attachment } from "./types";

interface ChatComposerProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        continue;
      }

      // Validate type
      const isImage = file.type.startsWith("image/");
      const isCsvOrExcel =
        file.name.endsWith(".csv") ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        ALLOWED_TYPES.includes(file.type);

      if (!isImage && !isCsvOrExcel) {
        setUploadError(`Unsupported file format. Please upload photos (JPEG/PNG) or CSV/Excel files.`);
        continue;
      }

      const url = URL.createObjectURL(file);
      newAttachments.push({
        id: `att_${Date.now()}_${i}`,
        file,
        url,
        name: file.name,
        type: isImage ? "image" : "document",
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || disabled) return;

    onSendMessage(text.trim(), attachments);
    setText("");
    setAttachments([]);
    setUploadError(null);

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-expand textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const canSend = (Boolean(text.trim()) || attachments.length > 0) && !disabled;

  return (
    <div className="bg-white border-t border-stone-200 px-4 sm:px-6 py-3 sticky bottom-0 z-20 shadow-lg">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Attachment Thumbnails Preview Bar */}
        {attachments.length > 0 && (
          <div className="flex items-center space-x-2.5 overflow-x-auto py-1 px-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group shrink-0 rounded-xl overflow-hidden border border-amber-300 bg-amber-50 p-1 shadow-2xs flex items-center space-x-2"
              >
                {att.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.url} alt={att.name} className="w-12 h-12 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-stone-200 flex items-center justify-center text-lg">
                    📊
                  </div>
                )}
                <div className="pr-6 max-w-[120px]">
                  <span className="text-[11px] font-medium text-stone-800 truncate block">
                    {att.name}
                  </span>
                  <span className="text-[9px] text-amber-800 font-bold uppercase">
                    Ready to attach
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-stone-900/80 text-white flex items-center justify-center text-xs hover:bg-rose-600 transition"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-rose-600">⚠️</span>
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-stone-400 hover:text-stone-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Composer Form Controls */}
        <div className="flex items-end space-x-2">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.csv,.xlsx,.xls"
            onChange={handleFileChange}
            multiple
            className="hidden"
            id="chat-file-input"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-3 text-stone-600 hover:text-amber-800 bg-stone-100 hover:bg-amber-50 border border-stone-300 rounded-xl transition shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Attach photo or farm data file (image/*, .csv, .xlsx)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Text Area Input */}
          <div className="flex-1 min-h-[44px]">
            <label htmlFor="farmer-chat-input" className="sr-only">
              Type your farming question
            </label>
            <textarea
              id="farmer-chat-input"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Ask about crops, soil, pests, market prices, or upload leaf photo..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition resize-none max-h-36 leading-snug"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`p-3 rounded-xl transition duration-150 shrink-0 font-bold min-w-[44px] min-h-[44px] flex items-center justify-center ${
              canSend
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
            title="Send Message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
