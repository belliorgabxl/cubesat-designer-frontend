import { BuilderWorkspace } from "@/components/builder/BuilderWorkspace";

export const metadata = { title: "แก้ไขแบบ — CubeSat Designer" };

export default async function EditDesignPage({ params }: PageProps<"/builder/[id]">) {
  const { id } = await params;
  return <BuilderWorkspace designId={id} />;
}
