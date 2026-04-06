/**
 * Merge class names (Tailwind-friendly). Skip extra deps.
 * @param  {...(string | false | undefined | null)} classes
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
