"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, EmptyState, ErrorState, PageContainer, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { toModuleMap } from "@/lib/placement";
import type { Design } from "@/lib/types";

import { DesignCard } from "./DesignCard";

async function loadMyDesigns() {
  const [{ designs }, { modules }] = await Promise.all([api.myDesigns(), api.modules()]);
  return { designs, modules: toModuleMap(modules) };
}

function CardActions({ design, onDeleted, onError }: { design: Design; onDeleted: () => void; onError: (message: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteDesign(design.id);
      onDeleted();
    } catch (error) {
      onError(errorMessage(error));
      setDeleting(false);
      setConfirming(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/d/${design.share_slug}`);
      setCopied(true);
    } catch {
      onError("คัดลอกลิงก์ไม่ได้ เปิดแบบแล้วกด Share แทน");
    }
  }

  if (confirming) {
    return (
      <>
        <span className="text-sm text-ink-dim">ลบแบบนี้ถาวร?</span>
        <Button variant="danger" disabled={deleting} onClick={remove} className="ml-auto">
          {deleting ? "กำลังลบ…" : "ลบ"}
        </Button>
        <Button disabled={deleting} onClick={() => setConfirming(false)}>
          ยกเลิก
        </Button>
      </>
    );
  }

  return (
    <>
      {design.is_public && <span className="font-mono text-[11px] text-signal">สาธารณะ</span>}
      <Button className="ml-auto" onClick={copyLink}>
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
      </Button>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        ลบ
      </Button>
    </>
  );
}

export function MyDesignsView() {
  const router = useRouter();
  const result = useLoad(loadMyDesigns, "my-designs");
  const [deleted, setDeleted] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const httpStatus = result.status === "error" ? result.httpStatus : null;
  useEffect(() => {
    if (httpStatus === 401) router.replace("/login?next=/my-designs");
  }, [httpStatus, router]);

  const designs = result.status === "ready" ? result.data.designs.filter((design) => !deleted.includes(design.id)) : [];

  return (
    <PageContainer title="แบบของฉัน" subtitle="คลิกที่การ์ดเพื่อแก้ไขต่อ">
      {result.status === "loading" && <Spinner />}
      {result.status === "error" &&
        (result.httpStatus === 401 ? <Spinner /> : <ErrorState message={result.message} onRetry={result.retry} />)}
      {actionError && (
        <p role="alert" className="mb-4 text-sm text-bad">
          {actionError}
        </p>
      )}
      {result.status === "ready" && designs.length === 0 && (
        <EmptyState title="ยังไม่มีแบบที่บันทึกไว้">
          <Link href="/builder" className="text-sm text-signal hover:underline">
            เริ่มออกแบบดาวเทียม
          </Link>
        </EmptyState>
      )}
      {result.status === "ready" && designs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              modules={result.data.modules}
              href={`/builder/${design.id}`}
              actions={
                <CardActions
                  design={design}
                  onDeleted={() => setDeleted((ids) => [...ids, design.id])}
                  onError={setActionError}
                />
              }
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
