import { notFound } from "next/navigation";
import { BoardImageToggle } from "@/components/BoardImageToggle";
import { PageHeader } from "@/components/PageHeader";
import { getAllBoardDetailSlugs, getBoardDetail } from "@/lib/entities/boards";

export function generateStaticParams() {
  return getAllBoardDetailSlugs().map((slug) => ({ slug }));
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const boardDetail = getBoardDetail(slug);
  if (!boardDetail) notFound();

  const { entry } = boardDetail;
  const { title, board } = entry;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        title={title}
        subtitle={boardDetail.subtitle}
        categories={boardDetail.categories}
      />

      <BoardImageToggle
        title={title}
        imageURL={board.imageURL}
        imageSecondaryURL={board.imageSecondaryURL}
        areas={boardDetail.areas}
        cropTop={boardDetail.cropTop}
      />
    </main>
  );
}
