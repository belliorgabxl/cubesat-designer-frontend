"use client";

import type { ReactNode } from "react";

import { ErrorState, Meter, StatusLamp } from "@/components/ui";
import { formatMass, formatUsd, formatWatts, missionLabel } from "@/lib/labels";
import type { Evaluation, MissionType } from "@/lib/types";
import type { EvaluationState } from "@/lib/useEvaluation";

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-ink-dim">{label}</span>
      <span className={`font-mono ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function SlotGrid({ result }: { result: Evaluation }) {
  const occupied = new Set(result.slots.occupied);
  const conflicts = new Set(result.slots.conflicts);
  return (
    <div className="flex flex-wrap gap-0.5" aria-hidden>
      {Array.from({ length: result.slots.total }, (_, slot) => (
        <span
          key={slot}
          className={`h-3 w-3 rounded-[2px] ${
            conflicts.has(slot) ? "bg-bad" : occupied.has(slot) ? "bg-signal" : "bg-raised"
          }`}
        />
      ))}
    </div>
  );
}

function MissionChecklist({ result, missionType }: { result: Evaluation; missionType: MissionType }) {
  const missing = result.mission.missing;
  return (
    <>
      <p className="text-sm">{missionLabel(missionType)}</p>
      {missing.length === 0 ? (
        <p className="mt-1 text-xs text-ok">มีอุปกรณ์ครบตามภารกิจ</p>
      ) : (
        <ul className="mt-1.5 space-y-1 text-xs text-warn">
          {missing.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Everything here is displayed exactly as Django computed it. */
export function BudgetPanel({
  evaluation,
  missionType,
  footer,
}: {
  evaluation: EvaluationState;
  missionType: MissionType;
  footer?: ReactNode;
}) {
  const { result, loading, error, retry } = evaluation;

  // Mission gaps are already shown in the checklist above the warnings list.
  const otherWarnings = result ? result.warnings.filter((warning) => !result.mission.missing.includes(warning)) : [];

  return (
    <aside aria-label="งบประมาณดาวเทียม" className="flex h-full min-h-0 flex-col border-l border-line bg-deck">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 className="text-sm font-medium">Budget</h2>
        <span className={`font-mono text-[11px] transition-opacity ${loading ? "text-signal opacity-100" : "opacity-0"}`} role="status">
          กำลังคำนวณ…
        </span>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {error && <ErrorState message={error} onRetry={retry} />}
        {!result && !error && (
          <div className="space-y-3 p-3" aria-hidden>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-md bg-panel" />
            ))}
          </div>
        )}
        {result && (
          <div className={error ? "opacity-50" : ""}>
            <Section title="น้ำหนัก (MASS)" aside={<StatusLamp status={result.mass.status} />}>
              <div className="mb-1.5 flex items-baseline justify-between font-mono text-sm">
                <span>{formatMass(result.mass.total_g)}</span>
                <span className="text-xs text-ink-faint">
                  {result.mass.pct}% ของ {formatMass(result.mass.max_g)}
                </span>
              </div>
              <Meter value={result.mass.pct} status={result.mass.status} label="น้ำหนักเทียบกับขีดจำกัด" />
            </Section>

            <Section title="ช่องภายใน (SLOTS)">
              <div className="mb-1.5 flex items-baseline justify-between font-mono text-sm">
                <span>
                  {result.slots.used} / {result.slots.total}
                </span>
                <span className="text-xs text-ink-faint">ว่าง {result.slots.free.length} ช่อง</span>
              </div>
              <SlotGrid result={result} />
            </Section>

            <Section title="พลังงาน (POWER)" aside={<StatusLamp status={result.power.status} />}>
              <div className="space-y-1">
                <Readout label="ผลิตช่วงรับแสง" value={formatWatts(result.power.generate_sunlit_w)} />
                <Readout
                  label="ผลิตเฉลี่ยทั้งวงโคจร"
                  value={formatWatts(result.power.generate_avg_w)}
                  tone={result.power.status === "OK" ? "text-ok" : "text-warn"}
                />
                <Readout label="ใช้ไฟ" value={formatWatts(result.power.consume_w)} />
              </div>
            </Section>

            <Section title="วงโคจร (ORBIT)">
              <div className="space-y-1">
                <Readout label="ความสูง" value={`${result.orbit.altitude_km} km`} />
                <Readout label="คาบโคจร" value={`${result.orbit.period_min} นาที`} />
                <Readout label="อยู่ในเงาโลก" value={`${(result.orbit.eclipse_fraction * 100).toFixed(1)}%`} />
              </div>
            </Section>

            <Section title="ภารกิจ (MISSION)">
              <MissionChecklist result={result} missionType={missionType} />
            </Section>

            <Section title="ราคารวมโดยประมาณ">
              <p className="font-mono text-lg">{formatUsd(result.cost_usd)}</p>
            </Section>

            {(result.errors.length > 0 || otherWarnings.length > 0) && (
              <Section title="คำเตือน">
                <ul className="space-y-1.5 text-xs">
                  {result.errors.map((message) => (
                    <li key={message} className="text-bad">
                      {message}
                    </li>
                  ))}
                  {otherWarnings.map((message) => (
                    <li key={message} className="text-warn">
                      {message}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </div>

      {footer}
    </aside>
  );
}
