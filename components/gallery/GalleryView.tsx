"use client";

import Link from "next/link";

import { EmptyState, ErrorState, PageContainer, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { toModuleMap } from "@/lib/placement";

import { DesignCard } from "./DesignCard";

async function loadGallery() {
  const [{ designs }, { modules }] = await Promise.all([api.gallery(), api.modules()]);
  return { designs, modules: toModuleMap(modules) };
}

export function GalleryView() {
  const gallery = useLoad(loadGallery, "gallery");

  return (
    <PageContainer title="แกลเลอรี" subtitle="แบบดาวเทียมที่ผู้ใช้เปิดเป็นสาธารณะ คลิกเพื่อหมุนดูแบบ 3 มิติ">
      {gallery.status === "loading" && <Spinner />}
      {gallery.status === "error" && <ErrorState message={gallery.message} onRetry={gallery.retry} />}
      {gallery.status === "ready" && gallery.data.designs.length === 0 && (
        <EmptyState title="ยังไม่มีแบบสาธารณะ">
          <Link href="/builder" className="text-sm text-signal hover:underline">
            ออกแบบดาวเทียมดวงแรก
          </Link>
        </EmptyState>
      )}
      {gallery.status === "ready" && gallery.data.designs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.data.designs.map((design) => (
            <DesignCard key={design.id} design={design} modules={gallery.data.modules} href={`/d/${design.share_slug}`} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
