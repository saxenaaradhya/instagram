import PdfViewer from "@/components/PdfViewer";

export default function ViewPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const name = id.split("__")[1]?.replace(/\.pdf$/, "") ?? "Document";
  return <PdfViewer id={id} name={name} />;
}
