"use client";

import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OrbitSimulation } from "@/components/orbit/OrbitSimulation";
import { CanvasBoundary } from "@/components/three/CanvasBoundary";
import { Button, ErrorState, Spinner } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { type Catalogue, useCatalogue, useIsDesktop, useLoad } from "@/lib/hooks";
import { adaptPlacements } from "@/lib/placement";
import type { Design, Frame, ModuleMap } from "@/lib/types";
import { useEvaluation } from "@/lib/useEvaluation";
import { useAuthStore } from "@/store/auth";
import { type BuilderDoc, isDirty, useBuilderStore } from "@/store/builder";

import { BudgetPanel } from "./BudgetPanel";
import { DragGhost } from "./DragGhost";
import { ModuleLibrary } from "./ModuleLibrary";
import { PlacedParts } from "./PlacedParts";
import { ShareDialog } from "./ShareDialog";
import { TopBar } from "./TopBar";

const BuilderScene = dynamic(() => import("@/components/three/BuilderScene"), {
  ssr: false,
  loading: () => <Spinner label="กำลังเตรียมฉาก 3D…" />,
});

const ViewerScene = dynamic(() => import("@/components/three/ViewerScene"), {
  ssr: false,
  loading: () => <Spinner label="กำลังเตรียมฉาก 3D…" />,
});

const DRAFT_KEY = "cubesat-designer:draft";
const DEFAULT_FRAME_SIZE = 3;

function readDraft(frames: Frame[], modules: ModuleMap): BuilderDoc | null {
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(DRAFT_KEY);
  try {
    const draft = JSON.parse(raw) as BuilderDoc;
    const frame = frames.find((item) => item.id === draft.frameId);
    if (!frame) return null;
    return { ...draft, placements: adaptPlacements(draft.placements, frame, modules).placements };
  } catch {
    return null;
  }
}

function defaultFrame(frames: Frame[]): Frame {
  return frames.find((frame) => frame.size_u === DEFAULT_FRAME_SIZE) ?? frames[0];
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function useKeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || document.querySelector("dialog[open]")) return;
      const { undo, redo, removeSelected, select } = useBuilderStore.getState();
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (command && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (command && key === "y") {
        event.preventDefault();
        redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
      } else if (event.key === "Escape") {
        select(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function Editor({ catalogue }: { catalogue: Catalogue }) {
  const router = useRouter();
  const pathname = usePathname();
  const doc = useBuilderStore((state) => state.doc);
  const designId = useBuilderStore((state) => state.designId);
  const exploded = useBuilderStore((state) => state.exploded);
  const deployed = useBuilderStore((state) => state.deployed);
  const dragging = useBuilderStore((state) => state.draggingSlug !== null);
  const notice = useBuilderStore((state) => state.notice);
  const setExploded = useBuilderStore((state) => state.setExploded);
  const setDeployed = useBuilderStore((state) => state.setDeployed);
  const setNotice = useBuilderStore((state) => state.setNotice);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);

  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useKeyboardShortcuts();

  const frame = catalogue.frames.find((item) => item.id === doc?.frameId) ?? null;

  const evaluation = useEvaluation(
    useMemo(
      () =>
        doc && {
          frameId: doc.frameId,
          missionType: doc.missionType,
          altitudeKm: doc.altitudeKm,
          placements: doc.placements,
        },
      [doc],
    ),
  );

  useEffect(() => {
    function warnIfUnsaved(event: BeforeUnloadEvent) {
      if (useBuilderStore.getState().past.length > 0 && isDirty(useBuilderStore.getState())) event.preventDefault();
    }
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, []);

  useEffect(() => {
    if (pathname === "/builder" && useBuilderStore.getState().designId !== null) {
      useBuilderStore.getState().startNew(defaultFrame(catalogue.frames));
    }
  }, [pathname, catalogue.frames]);

  const save = useCallback(async (): Promise<Design | null> => {
    const state = useBuilderStore.getState();
    if (!state.doc) return null;

    if (authStatus === "ready" && !user) {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state.doc));
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        name: state.doc.name,
        frame: state.doc.frameId,
        mission_type: state.doc.missionType,
        altitude_km: state.doc.altitudeKm,
        placements: state.doc.placements,
      };
      const { design } =
        state.designId === null ? await api.createDesign(payload) : await api.updateDesign(state.designId, payload);
      markSaved(design);
      if (state.designId === null) window.history.replaceState(null, "", `/builder/${design.id}`);
      setNotice("บันทึกแล้ว");
      return design;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(state.doc));
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return null;
      }
      setNotice(errorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  }, [authStatus, user, router, pathname, markSaved, setNotice]);

  const share = useCallback(async () => {
    const state = useBuilderStore.getState();
    const ready = isDirty(state) ? await save() : true;
    if (ready) setSharing(true);
  }, [save]);

  if (!doc || !frame) return <Spinner />;

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] min-h-0 flex-col">
      <TopBar frames={catalogue.frames} modules={catalogue.moduleMap} saving={saving} onSave={save} onShare={share} />

      <div className="grid min-h-0 flex-1 grid-cols-[17rem_minmax(0,1fr)_19rem] grid-rows-[minmax(0,1fr)]">
        <ModuleLibrary modules={catalogue.modules} moduleMap={catalogue.moduleMap} frame={frame} />

        <main className="starfield relative min-h-0 bg-void">
          <CanvasBoundary>
            <BuilderScene frame={frame} modules={catalogue.moduleMap} />
          </CanvasBoundary>

          {notice && (
            <div
              role="status"
              className="absolute top-3 left-1/2 flex max-w-[80%] -translate-x-1/2 items-center gap-3 rounded-md border border-line-strong bg-raised/95 px-3 py-1.5 text-sm"
            >
              {notice}
              <button
                type="button"
                aria-label="ปิดข้อความ"
                onClick={() => setNotice(null)}
                className="text-ink-faint transition-colors hover:text-ink"
              >
                ×
              </button>
            </div>
          )}

          {!dragging && doc.placements.internal.length + doc.placements.faces.length === 0 && (
            <p className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-32 rounded-md bg-void/70 px-3 py-1.5 text-sm text-ink-dim">
              ลากโมดูลจากคลังด้านซ้ายเข้ามาในโครง
            </p>
          )}

          <div className="absolute bottom-3 left-3 font-mono text-[11px] leading-5 text-ink-faint">
            <div>{frame.name}</div>
            <div>ลาก = หมุน · ล้อเมาส์ = ซูม · Delete = ลบชิ้นที่เลือก</div>
          </div>

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <Button aria-pressed={deployed} onClick={() => setDeployed(!deployed)} className="bg-deck/80">
              {deployed ? "พับแผง" : "กางแผง"}
            </Button>
            <Button aria-pressed={exploded} onClick={() => setExploded(!exploded)} className="bg-deck/80">
              {exploded ? "ประกอบกลับ" : "Exploded view"}
            </Button>
            <Button variant="primary" onClick={() => setSimulating(true)}>
              จำลองวงโคจร
            </Button>
          </div>
        </main>

        <div className="flex min-h-0 flex-col">
          <BudgetPanel
            evaluation={evaluation}
            missionType={doc.missionType}
            footer={<PlacedParts placements={doc.placements} modules={catalogue.moduleMap} />}
          />
        </div>
      </div>

      <DragGhost modules={catalogue.moduleMap} />
      {sharing && designId !== null && <ShareDialog onClose={() => setSharing(false)} />}
      {simulating && (
        <OrbitSimulation
          frame={frame}
          placements={doc.placements}
          modules={catalogue.moduleMap}
          altitudeKm={doc.altitudeKm}
          onClose={() => setSimulating(false)}
        />
      )}
    </div>
  );
}

/** Phones and small tablets get a look at the design and a pointer to a real screen. */
function MobileNotice({ catalogue }: { catalogue: Catalogue }) {
  const doc = useBuilderStore((state) => state.doc);
  const frame = catalogue.frames.find((item) => item.id === doc?.frameId) ?? null;
  if (!doc || !frame) return <Spinner />;

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] flex-col">
      <p role="status" className="border-b border-line bg-raised px-4 py-3 text-sm">
        หน้าจอนี้ดูแบบได้อย่างเดียว กรุณาใช้คอมพิวเตอร์เพื่อออกแบบดาวเทียม
      </p>
      <h1 className="px-4 pt-3 font-medium">{doc.name}</h1>
      <main className="starfield min-h-0 flex-1">
        <CanvasBoundary>
          <ViewerScene frame={frame} placements={doc.placements} modules={catalogue.moduleMap} />
        </CanvasBoundary>
      </main>
    </div>
  );
}

export function BuilderWorkspace({ designId }: { designId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const catalogue = useCatalogue();
  const design = useLoad<Design | null>(
    () => (designId ? api.getDesign(designId).then((response) => response.design) : Promise.resolve(null)),
    `design:${designId ?? "new"}`,
  );
  const initialized = useRef(false);

  const designHttpStatus = design.status === "error" ? design.httpStatus : null;
  const catalogueData = catalogue.status === "ready" ? catalogue.data : null;
  const designReady = design.status === "ready";
  const designData = design.status === "ready" ? design.data : null;

  useEffect(() => {
    if (!catalogueData || !designReady || initialized.current) return;
    initialized.current = true;
    const store = useBuilderStore.getState();
    if (designData) {
      store.loadDesign(designData, catalogueData.moduleMap);
      return;
    }
    const draft = readDraft(catalogueData.frames, catalogueData.moduleMap);
    store.startNew(defaultFrame(catalogueData.frames), draft);
    if (draft) store.setNotice("กู้คืนแบบที่ยังไม่บันทึกแล้ว กด Save อีกครั้งเพื่อบันทึก");
  }, [catalogueData, designData, designReady]);

  useEffect(() => {
    if (designHttpStatus === 401) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [designHttpStatus, pathname, router]);

  if (catalogue.status === "error") return <ErrorState message={catalogue.message} onRetry={catalogue.retry} />;
  if (design.status === "error") {
    if (design.httpStatus === 401) return <Spinner />;
    // Being refused or a missing design will not change on retry.
    if (design.httpStatus === 403 || design.httpStatus === 404) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center">
          <ErrorState message={design.message} />
          <Button onClick={() => router.push("/builder")}>เริ่มแบบใหม่</Button>
        </div>
      );
    }
    return <ErrorState message={design.message} onRetry={design.retry} />;
  }
  if (catalogue.status === "loading" || design.status === "loading") return <Spinner />;
  if (catalogue.data.frames.length === 0) {
    return <ErrorState message="ยังไม่มีข้อมูลโครงในระบบ รัน python manage.py seed_data ก่อน" onRetry={catalogue.retry} />;
  }

  return isDesktop ? <Editor catalogue={catalogue.data} /> : <MobileNotice catalogue={catalogue.data} />;
}
