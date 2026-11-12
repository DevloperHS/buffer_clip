import { EditorScreen } from '@/features/editor/EditorScreen';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorScreen id={id} />;
}
