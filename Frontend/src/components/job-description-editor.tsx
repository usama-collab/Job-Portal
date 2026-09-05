import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { descriptionHtml } from "../lib/job-description";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function JobDescriptionEditor({ value, onChange, onBlur, disabled = false, invalid = false }: Props) {
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: { levels: [2, 3] },
      blockquote: false, code: false, codeBlock: false, horizontalRule: false,
      strike: false, underline: false, link: false, trailingNode: false,
    })],
    content: descriptionHtml(value),
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: {
      id: "job-description", role: "textbox", "aria-label": "Job Description",
      "aria-multiline": "true", "aria-required": "true",
      class: "job-rich-text min-h-50 p-4 outline-none text-slate-700",
    } },
    onUpdate: ({ editor }) => onChange(editor.getText().trim() ? editor.getHTML() : ""),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === "" && editor.isEmpty)) {
      editor.commands.setContent(descriptionHtml(value), { emitUpdate: false });
    }
  }, [editor, value]);
  useEffect(() => {
    editor?.view.dom.setAttribute("aria-invalid", String(invalid));
  }, [editor, invalid]);

  const actions = editor ? [
    { label: "Paragraph", content: "P", active: editor.isActive("paragraph"), run: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading", content: "H2", active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", content: "H3", active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bold", content: <Bold size={16} />, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", content: <Italic size={16} />, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Bullet list", content: <List size={16} />, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", content: <ListOrdered size={16} />, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
  ] : [];

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-xs focus-within:ring-2 focus-within:ring-blue-500 ${invalid ? "border-red-500" : "border-slate-200"} ${disabled ? "opacity-50" : ""}`}>
      <div role="group" aria-label="Description formatting" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {actions.map(({ label, content, active, run }) => (
          <button key={label} type="button" title={label} aria-label={label} aria-pressed={active}
            disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={run}
            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed ${active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-200"}`}>
            {content}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
