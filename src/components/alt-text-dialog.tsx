"use client";

import { MAX_ALT_TEXT_LENGTH } from "@/lib/validators/media";
import { Button } from "./ui/button";

interface AltTextDialogProps {
  open: boolean;
  imageUrl: string;
  altText: string;
  onAltTextChange: (text: string) => void;
  onClose: () => void;
}

export function AltTextDialog({
  open,
  imageUrl,
  altText,
  onAltTextChange,
  onClose,
}: AltTextDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-testid="alt-text-backdrop"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border border-glass-border bg-popover p-6 shadow-xl backdrop-blur-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Alt Text</h3>
          <Button variant="ghost" size="xs" onClick={onClose}>
            Done
          </Button>
        </div>

        {/* Image preview */}
        <div className="mb-4 rounded-lg overflow-hidden bg-muted/20 max-h-48 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-48 object-contain"
          />
        </div>

        {/* Alt text input */}
        <textarea
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          placeholder="Describe this image for visually impaired users..."
          maxLength={MAX_ALT_TEXT_LENGTH}
          rows={3}
          className="w-full resize-none rounded border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring/50"
        />

        <div className="flex justify-end mt-2">
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground/40">
            {altText.length}/{MAX_ALT_TEXT_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
