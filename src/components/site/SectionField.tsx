/**
 * Per-section light treatment.
 *
 * The reference never leaves a section sitting on flat black -- each one gets
 * its own light source, which is what stops a long page reading as a stack of
 * card grids. Pure CSS gradients rather than another WebGL canvas, because one
 * shader in the hero is a feature and six down the page is a battery bill.
 */
export type FieldVariant = "top" | "bottom" | "left" | "right" | "center";
const FIELDS: Record<FieldVariant, string> = {
  top: "bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)/0.13),transparent_70%)]",
  bottom:
    "bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,hsl(var(--primary)/0.13),transparent_70%)]",
  left: "bg-[radial-gradient(ellipse_55%_70%_at_0%_50%,hsl(var(--primary)/0.11),transparent_65%)]",
  right:
    "bg-[radial-gradient(ellipse_55%_70%_at_100%_50%,hsl(var(--primary)/0.11),transparent_65%)]",
  center:
    "bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,hsl(var(--primary)/0.10),transparent_70%)]",
};
export function SectionField({ variant = "top" }: { variant?: FieldVariant }) {
  // There was a hairline of light along the top edge here. Between two sections
  // of the same tone it did not read as a seam, it read as a stray 1px rule
  // drawn across the page. The radial light already separates one section from
  // the next; a border on top of it is the belt-and-braces that looks like a
  // mistake.
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${FIELDS[variant]}`}
    />
  );
}
