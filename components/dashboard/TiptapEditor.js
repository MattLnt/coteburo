"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useCallback } from "react";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minWidth: 32, height: 32, padding: "0 8px", borderRadius: 7,
        border: "1px solid " + (active ? "#f0661b" : "#e8e3da"),
        background: active ? "#fce6d6" : "#fff",
        color: active ? "#d9551a" : "#23262a",
        fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer",
        display: "grid", placeItems: "center", opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function TiptapEditor({ value, onChange }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Image.configure({ HTMLAttributes: { style: "border-radius:12px;max-width:100%;height:auto;margin:16px 0;" } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { style: "color:#f0661b;text-decoration:underline;" } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: "min-height:320px;padding:18px;outline:none;font-size:15px;line-height:1.7;color:#23262a;",
      },
    },
  });

  const ajouterImage = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", PRESET);
      fd.append("folder", "coteburo/blog");
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.secure_url) editor.chain().focus().setImage({ src: data.secure_url }).run();
      } catch {
        alert("Erreur lors de l'upload de l'image.");
      }
    };
    input.click();
  }, [editor]);

  const ajouterLien = useCallback(() => {
    const url = window.prompt("URL du lien :");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={{ border: "1.5px solid #e8e3da", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      {/* Barre d'outils */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 10, borderBottom: "1px solid #f0ece4", background: "#faf8f4" }}>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras"><b>B</b></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique"><i>I</i></Btn>
        <div style={{ width: 1, background: "#e8e3da", margin: "0 2px" }} />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titre">T1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Sous-titre">T2</Btn>
        <div style={{ width: 1, background: "#e8e3da", margin: "0 2px" }} />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste à puces">•</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numérotée">1.</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citation">"</Btn>
        <div style={{ width: 1, background: "#e8e3da", margin: "0 2px" }} />
        <Btn onClick={ajouterLien} active={editor.isActive("link")} title="Lien">🔗</Btn>
        <Btn onClick={ajouterImage} title="Image">🖼</Btn>
        <div style={{ width: 1, background: "#e8e3da", margin: "0 2px" }} />
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">↶</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">↷</Btn>
      </div>

      {/* Zone d'édition */}
      <EditorContent editor={editor} className="tiptap-content" />

      <style>{`
        .tiptap-content h2 { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 20px 0 10px; color: #23262a; }
        .tiptap-content h3 { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 16px 0 8px; color: #23262a; }
        .tiptap-content p { margin: 10px 0; }
        .tiptap-content ul { list-style: disc; padding-left: 24px; margin: 10px 0; }
        .tiptap-content ol { list-style: decimal; padding-left: 24px; margin: 10px 0; }
        .tiptap-content blockquote { border-left: 3px solid #f0661b; padding-left: 16px; margin: 14px 0; color: #5c616a; font-style: italic; }
        .tiptap-content:focus { outline: none; }
        .tiptap-content .ProseMirror { min-height: 320px; }
        .tiptap-content .ProseMirror:focus { outline: none; }
        .tiptap-content p.is-editor-empty:first-child::before { content: "Rédigez votre article ici…"; color: #9aa0a8; float: left; height: 0; pointer-events: none; }
      `}</style>
    </div>
  );
}