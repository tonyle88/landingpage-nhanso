"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "../admin.module.css";

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";
type Alignment = "left" | "center" | "right" | "justify";

type RichTextEditorProps = {
  compact?: boolean;
  initialValue?: string;
  label?: string;
  maxLength?: number;
  name?: string;
  placeholder?: string;
};

const alignmentClasses = [
  "editor-align-left",
  "editor-align-center",
  "editor-align-right",
  "editor-align-justify",
];

export function RichTextEditor({
  compact = false,
  initialValue = "",
  label = "Nội dung bài viết",
  maxLength = 100000,
  name = "content_html",
  placeholder = "Bắt đầu viết nội dung bài viết…",
}: RichTextEditorProps) {
  const id = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef(initialValue);
  const [sourceMode, setSourceMode] = useState(false);

  useEffect(() => {
    htmlRef.current = initialValue;
    if (inputRef.current) inputRef.current.value = initialValue;
    if (editorRef.current) editorRef.current.innerHTML = initialValue;
  }, [initialValue]);

  function syncFromVisual() {
    if (!inputRef.current || !editorRef.current) return;
    htmlRef.current = editorRef.current.innerHTML;
    inputRef.current.value = htmlRef.current;
  }

  function run(command: Command) {
    editorRef.current?.focus();
    document.execCommand(command);
    syncFromVisual();
  }

  function block(tag: "p" | "h2" | "h3" | "blockquote") {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    syncFromVisual();
  }

  function normalizeAlignmentMarkup() {
    editorRef.current?.querySelectorAll<HTMLElement>("[style], [align]").forEach((element) => {
      const alignment = element.style.textAlign || element.getAttribute("align") || "";
      if (!alignmentClasses.includes(`editor-align-${alignment}`)) return;
      element.classList.remove(...alignmentClasses);
      element.classList.add(`editor-align-${alignment}`);
      element.style.removeProperty("text-align");
      if (!element.getAttribute("style")) element.removeAttribute("style");
      element.removeAttribute("align");
    });
  }

  function align(value: Alignment) {
    editorRef.current?.focus();
    const command = value === "justify" ? "justifyFull" : `justify${value[0].toUpperCase()}${value.slice(1)}`;
    document.execCommand(command);
    normalizeAlignmentMarkup();
    syncFromVisual();
  }

  function addLink() {
    const url = window.prompt("Nhập URL liên kết HTTPS");
    if (!url) return;
    if (!/^https:\/\//i.test(url)) {
      window.alert("Liên kết phải bắt đầu bằng https://");
      return;
    }
    editorRef.current?.focus();
    document.execCommand("createLink", false, url);
    syncFromVisual();
  }

  function toggleSource() {
    if (sourceMode && editorRef.current && inputRef.current) {
      htmlRef.current = inputRef.current.value;
      editorRef.current.innerHTML = htmlRef.current;
    } else {
      normalizeAlignmentMarkup();
      syncFromVisual();
    }
    setSourceMode((value) => !value);
  }

  const editorClass = `${styles.richEditor}${compact ? ` ${styles.richEditorCompact}` : ""}`;

  return (
    <div className={editorClass}>
      <div className={styles.editorToolbar} role="toolbar" aria-label={`Công cụ soạn thảo ${label.toLowerCase()}`}>
        <button type="button" onClick={() => block("p")} title="Đoạn văn">P</button>
        {!compact ? <button type="button" onClick={() => block("h2")} title="Tiêu đề lớn">H2</button> : null}
        {!compact ? <button type="button" onClick={() => block("h3")} title="Tiêu đề nhỏ">H3</button> : null}
        <span />
        <button type="button" onClick={() => run("bold")} title="In đậm"><strong>B</strong></button>
        <button type="button" onClick={() => run("italic")} title="In nghiêng"><em>I</em></button>
        <button type="button" onClick={() => run("underline")} title="Gạch chân"><u>U</u></button>
        <span />
        <button type="button" onClick={() => align("left")} title="Căn trái" aria-label="Căn trái">≡←</button>
        <button type="button" onClick={() => align("center")} title="Căn giữa" aria-label="Căn giữa">≡</button>
        <button type="button" onClick={() => align("right")} title="Căn phải" aria-label="Căn phải">→≡</button>
        <button type="button" onClick={() => align("justify")} title="Căn đều hai bên" aria-label="Căn đều hai bên">☰</button>
        {!compact ? <button type="button" onClick={() => run("insertUnorderedList")} title="Danh sách chấm">• List</button> : null}
        {!compact ? <button type="button" onClick={() => run("insertOrderedList")} title="Danh sách số">1. List</button> : null}
        {!compact ? <button type="button" onClick={() => block("blockquote")} title="Trích dẫn">❝</button> : null}
        <button type="button" onClick={addLink} title="Thêm liên kết">↗ Link</button>
        <button className={sourceMode ? styles.toolbarActive : ""} type="button" onClick={toggleSource}
          title={sourceMode ? "Chuyển về Editor" : "Chỉnh mã HTML"}>
          {sourceMode ? "Editor" : "</> HTML"}
        </button>
      </div>
      <label className={styles.srOnly} htmlFor={id}>{label}</label>
      <textarea
        ref={inputRef}
        id={id}
        name={name}
        className={sourceMode ? styles.editorSource : styles.editorHiddenInput}
        defaultValue={initialValue}
        maxLength={maxLength}
        onInput={(event) => {
          htmlRef.current = event.currentTarget.value;
        }}
      />
      <div
        ref={editorRef}
        className={sourceMode ? styles.editorVisualHidden : styles.editorCanvas}
        contentEditable
        suppressContentEditableWarning
        onInput={syncFromVisual}
        data-placeholder={placeholder}
      />
      <div className={styles.editorHint}>
        Soạn trực quan, căn lề bằng toolbar hoặc chuyển giữa Editor và HTML mà không mất nội dung.
      </div>
    </div>
  );
}
