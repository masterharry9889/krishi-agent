"use client";

import React, { useState, useRef } from "react";
import { Attachment } from "./types";
import { Paperclip, Send, X, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        setUploadError(`Unsupported format. Please upload photos (JPEG/PNG) or CSV/Excel files.`);
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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  };

  const canSend = (Boolean(text.trim()) || attachments.length > 0) && !disabled;

  return (
    <div className="bg-background border-t border-border/80 px-4 sm:px-6 py-3 sticky bottom-0 z-20">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Attachment Thumbnails Preview Bar */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group shrink-0 rounded-md overflow-hidden border border-border bg-secondary/50 p-1 flex items-center gap-2"
              >
                {att.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                    <BarChart3 className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="pr-5 max-w-[110px]">
                  <span className="text-[11px] font-medium text-foreground truncate block">
                    {att.name}
                  </span>
                  <span className="text-[9px] text-primary font-mono font-semibold uppercase">
                    Attached
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="absolute top-1 right-1 size-4 rounded-full bg-foreground/80 text-background flex items-center justify-center hover:bg-destructive transition cursor-pointer"
                  title="Remove file"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-muted-foreground hover:text-foreground font-bold text-xs cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Composer Form Controls */}
        <div className="flex items-end gap-2">
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
            className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/80 rounded-md transition shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 h-9 w-9 flex items-center justify-center cursor-pointer"
            title="Attach leaf photograph or farm data file"
          >
            <Paperclip className="size-4" />
          </button>

          <div className="flex-1 min-h-[36px]">
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
              placeholder="Ask about crops, soil nutrients, pests, mandi timing, or leaf diagnosis..."
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition resize-none max-h-32 leading-snug"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2 rounded-md transition shrink-0 h-9 w-9 flex items-center justify-center cursor-pointer shadow-2xs ${
              canSend
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
            }`}
            title="Send Message"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
