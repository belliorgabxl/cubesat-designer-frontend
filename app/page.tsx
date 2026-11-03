import Link from "next/link";

import { HeroCanvas } from "@/components/Hero";

const STEPS = [
  {
    label: "01 · ประกอบ",
    title: "เลือกโครงและใส่ชิ้นส่วน",
    body: "เลือกโครง 1U, 3U หรือ 6U แล้วลากโมดูลลงช่อง ระบบจะ snap เข้าช่องว่างที่ใกล้ที่สุด พร้อมติดแผงโซลาร์ได้ทั้งแบบติดผิวและแบบกางออก",
  },
  {
    label: "02 · คำนวณ",
    title: "เห็นงบทันทีที่แก้แบบ",
    body: "น้ำหนัก ช่องภายใน พลังงาน และราคารวมอัปเดตแบบเรียลไทม์ พร้อมตรวจว่ามีอุปกรณ์ครบตามภารกิจที่เลือกหรือไม่",
  },
  {
    label: "03 · จำลอง",
    title: "ปล่อยขึ้นวงโคจร",
    body: "ดูดาวเทียมโคจรรอบโลก 3 รอบ เข้าและออกจากเงาโลก พร้อมกราฟแบตเตอรี่ที่บอกว่าแบบของคุณมีไฟพอหรือไม่",
  },
];

const FORMULAS = [
  { name: "คาบโคจร", formula: "T = 2π √((R + h)³ / μ)", note: "ที่ 500 km ได้ประมาณ 94.5 นาที" },
  { name: "สัดส่วนเวลาในเงาโลก", formula: "f = asin(R / (R + h)) / π", note: "ที่ 500 km ได้ประมาณ 37.8%" },
  { name: "กำลังผลิตเฉลี่ย", formula: "P = Σ(Pᵢ × kᵢ) × (1 − f)", note: "k = 0.5 แผงติดผิว, 0.75 แผงกางออก" },
];

export default function LandingPage() {
  return (
    <main className="starfield flex-1">
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto grid min-h-[calc(100dvh-3.25rem)] max-w-6xl items-center gap-4 px-4 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="relative z-10">
            <p className="eyebrow">เครื่องมือออกแบบดาวเทียมเชิงการศึกษา</p>
            <h1 className="mt-3 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              ออกแบบ CubeSat
              <br />
              <span className="text-solar">แล้วส่งขึ้นโคจร</span>
            </h1>
            <p className="mt-4 max-w-md leading-relaxed text-ink-dim">
              ประกอบดาวเทียมในแบบ 3 มิติ คำนวณงบน้ำหนักและพลังงาน แล้วจำลองดูว่าแบตเตอรี่พอตลอดวงโคจรหรือไม่
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/builder"
                className="rounded-md bg-solar px-5 py-2.5 font-medium text-void transition-colors hover:bg-solar-deep"
              >
                เริ่มออกแบบ
              </Link>
              <Link
                href="/gallery"
                className="rounded-md border border-line-strong px-5 py-2.5 transition-colors hover:bg-raised"
              >
                ดูแกลเลอรี
              </Link>
            </div>
          </div>
          <div className="h-[46dvh] min-h-72 lg:h-[72dvh]">
            <HeroCanvas />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.label} className="bg-deck p-6">
              <p className="eyebrow text-solar">{step.label}</p>
              <h2 className="mt-2 text-lg font-medium">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-xl font-semibold tracking-tight">หลักการคำนวณ</h2>
        <p className="mt-1 text-sm text-ink-dim">
          แบบจำลองวงโคจรวงกลมที่ β = 0 ตัวเลขเป็นค่าประมาณเพื่อการศึกษา ไม่ใช่การคำนวณระดับวิศวกรรมอวกาศ
        </p>
        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          {FORMULAS.map((item) => (
            <div key={item.name} className="rounded-lg border border-line bg-panel p-4">
              <dt className="text-sm text-ink-dim">{item.name}</dt>
              <dd className="mt-2 font-mono text-sm">{item.formula}</dd>
              <dd className="mt-2 text-xs text-ink-faint">{item.note}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
