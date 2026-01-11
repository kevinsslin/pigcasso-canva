import CanvasScreen from "@/features/canvases/screens/canvas-screen/canvas-screen";

type PageProps = {
  params: { canvasId: string };
};

export default function Page({ params }: PageProps) {
  return <CanvasScreen params={params} />;
}

