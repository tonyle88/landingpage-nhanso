"use client";

import { useId, useRef, useState } from "react";
import styles from "../admin.module.css";

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";

export function RichTextEditor({ initialValue = "" }: { initialValue?: string }) {
  const id = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [sourceMode, setSourceMode] = useState(false);

  function syncFromVisual() {
    if (inputRef.current && editorRef.current) inputRef.current.value = editorRef.current.innerHTML;
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
      editorRef.current.innerHTML = inputRef.current.value;
    } else {
      syncFromVisual();
    }
    setSourceMode((value) => !value);
  }

  return (
    <div className={styles.richEditor}>
      <div className={styles.editorToolbar} role="toolbar" aria-label="Công cụ soạn thảo">
        <button type="button" onClick={() => block("p")} title="Đoạn văn">P</button>
        <button type="button" onClick={() => block("h2")} title="Tiêu đề lớn">H2</button>
        <button type="button" onClick={() => block("h3")} title="Tiêu đề nhỏ">H3</button>
        <span />
        <button type="button" onClick={() => run("bold")} title="In đậm"><strong>B</strong></button>
        <button type="button" onClick={() => run("italic")} title="In nghiêng"><em>I</em></button>
        <button type="button" onClick={() => run("underline")} title="Gạch chân"><u>U</u></button>
        <button type="button" onClick={() => run("insertUnorderedList")} title="Danh sách chấm">• List</button>
        <button type="button" onClick={() => run("insertOrderedList")} title="Danh sách số">1. List</button>
        <button type="button" onClick={() => block("blockquote")} title="Trích dẫn">❝</button>
        <button type="button" onClick={addLink} title="Thêm liên kết">↗ Link</button>
        <button className={sourceMode ? styles.toolbarActive : ""} type="button" onClick={toggleSource} title="Xem mã HTML">&lt;/&gt;</button>
      </div>
      <label className={styles.srOnly} htmlFor={id}>Nội dung bài viết</label>
      <textarea
        ref={inputRef}
        id={id}
        name="content_html"
        className={sourceMode ? styles.editorSource : styles.editorHiddenInput}
        defaultValue={initialValue}
        maxLength={100000}
        onInput={(event) => {
          if (sourceMode && editorRef.current) editorRef.current.innerHTML = event.currentTarget.value;
        }}
      />
      <div
        ref={editorRef}
        className={sourceMode ? styles.editorVisualHidden : styles.editorCanvas}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: initialValue }}
        onInput={syncFromVisual}
        data-placeholder="Bắt đầu viết nội dung bài viết…"
      />
      <div className={styles.editorHint}>Có thể định dạng trực quan hoặc chuyển sang chế độ &lt;/&gt; để chỉnh HTML an toàn.</div>
    </div>
  );
}
