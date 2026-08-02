type ClowGlintProps = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  muted?: boolean;
};

export function ClowGlint({
  className = "",
  size = "md",
  muted = false,
}: ClowGlintProps) {
  return (
    <span
      aria-hidden="true"
      className={`clow-glint clow-glint--${size}${muted ? " clow-glint--muted" : ""}${className ? ` ${className}` : ""}`}
    />
  );
}

export function ClowGlintDivider() {
  return (
    <>
      <ClowGlint muted size="xs" />
      <ClowGlint size="sm" />
      <ClowGlint muted size="xs" />
    </>
  );
}
