import { Fragment, type ReactNode } from "react";

const BOLD_SPLIT = /(\*\*[^*]+\*\*)/g;

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(BOLD_SPLIT);
  return parts.flatMap((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return [
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-zinc-900">
          {m[1]}
        </strong>,
      ];
    }
    return part ? [<Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>] : [];
  });
}

const BULLET_LINE = /^\s*([-*•])\s+(.*)$/;
/** 1–99 only so lines like "2024. …" stay paragraphs, not list items. */
const ORDERED_LINE = /^\s*([1-9]\d{0,1})\.\s+(.*)$/;

function isBulletListBlock(lines: string[]): boolean {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  return nonEmpty.length >= 1 && nonEmpty.every((l) => BULLET_LINE.test(l));
}

function isOrderedListBlock(lines: string[]): boolean {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  return nonEmpty.length >= 1 && nonEmpty.every((l) => ORDERED_LINE.test(l));
}

function renderParagraph(block: string, index: number): ReactNode {
  const lines = block.split("\n");
  return (
    <p key={`p-${index}`} className="text-sm leading-relaxed text-zinc-800">
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 ? <br /> : null}
          {parseInline(line, `p-${index}-${li}`)}
        </Fragment>
      ))}
    </p>
  );
}

function renderBlock(raw: string, index: number): ReactNode {
  const block = raw.trim();
  if (!block) return null;

  const lines = block.split("\n");
  const headingMatch = lines[0].match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch && lines.length === 1) {
    return (
      <h3 key={`h-${index}`} className="text-sm font-semibold tracking-tight text-zinc-900">
        {parseInline(headingMatch[2], `h-${index}`)}
      </h3>
    );
  }

  if (headingMatch && lines.length > 1) {
    const rest = lines.slice(1).join("\n").trim();
    return (
      <div key={`hb-${index}`} className="space-y-2">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
          {parseInline(headingMatch[2], `h-${index}`)}
        </h3>
        {renderParagraph(rest, index + 1000)}
      </div>
    );
  }

  if (isOrderedListBlock(lines) && !isBulletListBlock(lines)) {
    return (
      <ol
        key={`ol-${index}`}
        className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-800 marker:font-medium marker:text-zinc-500"
      >
        {lines
          .filter((l) => l.trim())
          .map((line, li) => {
            const m = line.match(ORDERED_LINE);
            if (!m) return null;
            return (
              <li key={li} className="pl-1">
                {parseInline(m[2], `oli-${index}-${li}`)}
              </li>
            );
          })}
      </ol>
    );
  }

  if (isBulletListBlock(lines)) {
    return (
      <ul
        key={`ul-${index}`}
        className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-800 marker:text-zinc-400"
      >
        {lines
          .filter((l) => l.trim())
          .map((line, li) => {
            const m = line.match(BULLET_LINE);
            if (!m) return null;
            return (
              <li key={li} className="pl-1">
                {parseInline(m[2], `bli-${index}-${li}`)}
              </li>
            );
          })}
      </ul>
    );
  }

  return renderParagraph(block, index);
}

/** Renders Laoshi Gemini advice: headings, **bold**, bullets, numbered lists, line breaks — no HTML injection. */
export function GeminiAdviceFormatted({ text }: { text: string }) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const blocks = normalized.split(/\n{2,}/);

  return (
    <div className="space-y-3 [&_ul]:my-0 [&_ol]:my-0 [&_p]:my-0">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
