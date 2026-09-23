import { NavLink } from "react-router-dom";
import { securityTools } from "../../data/tools";
import { ToolIconGlyph } from "./ToolIconGlyph";
import { cn } from "../../lib/cn";

const itemBase =
  "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const itemActive = "border-accent-line bg-accent-soft text-accent";
const itemIdle = "border-border text-muted hover:border-accent-line hover:text-foreground";

/** Sidebar index of tools, used on individual tool pages. */
export function ToolNav() {
  return (
    <nav aria-label="Security tools" className="flex flex-col gap-2">
      {securityTools.map((tool) => (
        <NavLink
          key={tool.id}
          to={`/tools/${tool.slug}`}
          className={({ isActive }) => cn(itemBase, isActive ? itemActive : itemIdle)}
        >
          <ToolIconGlyph icon={tool.icon} size="sm" />
          {tool.name}
        </NavLink>
      ))}
    </nav>
  );
}
