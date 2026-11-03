import { SharedDesignView } from "@/components/gallery/SharedDesignView";

export const metadata = { title: "แบบที่แชร์ — CubeSat Designer" };

export default async function SharedDesignPage({ params }: PageProps<"/d/[slug]">) {
  const { slug } = await params;
  return <SharedDesignView slug={slug} />;
}
