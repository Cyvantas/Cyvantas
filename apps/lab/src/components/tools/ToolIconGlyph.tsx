import type { ReactElement } from "react";
import { Icon } from "../ui/Icon";
import {
  KeyIcon,
  CodeIcon,
  GlobeIcon,
  BracesIcon,
  FingerprintIcon,
  ShieldIcon,
  HeadersIcon,
  RegexIcon,
} from "../ui/icons";
import type { ToolIcon } from "../../models/tool";

const GLYPHS: Record<ToolIcon, () => ReactElement> = {
  key: KeyIcon,
  code: CodeIcon,
  globe: GlobeIcon,
  braces: BracesIcon,
  fingerprint: FingerprintIcon,
  shield: ShieldIcon,
  headers: HeadersIcon,
  regex: RegexIcon,
};

interface ToolIconGlyphProps {
  icon: ToolIcon;
  boxed?: boolean;
  size?: "sm" | "md" | "lg";
}

/** Resolves a tool's icon key to the matching inline glyph. Decorative. */
export function ToolIconGlyph({ icon, boxed = false, size = "md" }: ToolIconGlyphProps) {
  const Glyph = GLYPHS[icon];
  return (
    <Icon size={size} boxed={boxed}>
      <Glyph />
    </Icon>
  );
}
