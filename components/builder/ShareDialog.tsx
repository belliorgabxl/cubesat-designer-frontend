"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useBuilderStore } from "@/store/builder";

export function ShareDialog({ onClose }: { onClose: () => void }) {
  const designId = useBuilderStore((state) => state.designId);
  const shareSlug = useBuilderStore((state) => state.shareSlug);
  const isPublic = useBuilderStore((state) => state.isPublic);
  const setPublic = useBuilderStore((state) => state.setPublic);

  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const link = shareSlug ? `${window.location.origin}/d/${shareSlug}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกลิงก์จากช่องด้านบน");
    }
  }

  async function togglePublic(value: boolean) {
    if (designId === null) return;
    setBusy(true);
    setError(null);
    setPublic(value);
    try {
      await api.updateDesign(designId, { is_public: value });
    } catch (failure) {
      setPublic(!value);
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="share-title"
      className="m-auto w-full max-w-md rounded-lg border border-line-strong bg-panel p-5 text-ink backdrop:bg-void/70"
    >
      <h2 id="share-title" className="text-lg font-semibold">
        แชร์แบบนี้
      </h2>
      <p className="mt-1 text-sm text-ink-dim">ทุกคนที่มีลิงก์นี้เปิดดูแบบได้โดยไม่ต้องเข้าสู่ระบบ แต่แก้ไขไม่ได้</p>

      <div className="mt-4 flex gap-2">
        <input
          readOnly
          aria-label="ลิงก์แชร์"
          value={link}
          onFocus={(event) => event.target.select()}
          className="min-w-0 flex-1 rounded-md border border-line bg-deck px-2.5 py-1.5 font-mono text-xs"
        />
        <Button variant="primary" onClick={copy}>
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </Button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          disabled={busy}
          onChange={(event) => togglePublic(event.target.checked)}
          className="range-solar size-4"
        />
        แสดงในแกลเลอรีสาธารณะ
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={() => dialog.current?.close()}>ปิด</Button>
      </div>
    </dialog>
  );
}
