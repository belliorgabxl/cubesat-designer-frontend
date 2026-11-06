"use client";

import { Component, type ReactNode } from "react";

export class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-dim">
        แสดงภาพ 3D ไม่ได้ เบราว์เซอร์หรือการ์ดจออาจไม่รองรับ WebGL
      </div>
    );
  }
}
