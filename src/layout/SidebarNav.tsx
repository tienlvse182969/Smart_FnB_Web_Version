import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Mục thanh bên. `children` có giá trị = nhóm xổ ra (mục cha là nút, không điều hướng).
 * `badge` > 0 hiện số đếm; `tag` là nhãn nhỏ cạnh tên (vd "AI").
 */
export type NavItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  badge?: number | null;
  tag?: string;
  children?: NavItem[];
};

const storageKey = (scope: string) => `fnb.nav.open.${scope}`;

function readOpen(scope: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeOpen(scope: string, value: Record<string, boolean>) {
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(value));
  } catch {
    /* không có localStorage vẫn chạy đúng, chỉ không nhớ trạng thái */
  }
}

/** Nhóm chứa mục đang chọn (nếu có). */
export const groupOf = (nav: NavItem[], section: string): string | undefined =>
  nav.find((n) => n.children?.some((c) => c.key === section))?.key;

const Badge = ({ n, testId }: { n: number; testId: string }) => (
  <span className="sb-badge" data-testid={testId}>
    {n > 99 ? "99+" : n}
  </span>
);

export default function SidebarNav({
  scope,
  nav,
  section,
  onSelect,
}: {
  scope: string;
  nav: NavItem[];
  section: string;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => readOpen(scope));

  // Nhóm tự mở khi có mục con đang chọn (F5, link trực tiếp, nút Back).
  const activeGroup = groupOf(nav, section);
  useEffect(() => {
    if (!activeGroup) return;
    setOpen((current) => {
      if (current[activeGroup]) return current;
      const next = { ...current, [activeGroup]: true };
      writeOpen(scope, next);
      return next;
    });
  }, [activeGroup, scope]);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = { ...current, [key]: !current[key] };
      writeOpen(scope, next);
      return next;
    });

  const leaf = (item: NavItem, nested: boolean) => {
    const selected = item.key === section;
    return (
      <li key={item.key}>
        <button
          type="button"
          className={`sb-item${selected ? " sb-selected" : ""}${nested ? " sb-nested" : ""}`}
          aria-current={selected ? "page" : undefined}
          data-testid={`nav-${item.key}`}
          onClick={() => onSelect(item.key)}
        >
          {item.icon && <span className="sb-icon">{item.icon}</span>}
          <span className="sb-label">{item.label}</span>
          {item.tag && <span className="sb-tag">{item.tag}</span>}
          {item.badge && item.badge > 0 ? <Badge n={item.badge} testId={`nav-badge-${item.key}`} /> : null}
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Điều hướng chính">
      <ul className="sb-list">
        {nav.map((item) => {
          if (!item.children) return leaf(item, false);
          const isOpen = !!open[item.key];
          const childBadge = item.children.reduce((sum, c) => sum + (c.badge && c.badge > 0 ? c.badge : 0), 0);
          const panelId = `sb-group-${item.key}`;
          return (
            <li key={item.key}>
              <button
                type="button"
                className={`sb-item sb-group${isOpen ? " sb-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                data-testid={`nav-group-${item.key}`}
                onClick={() => toggle(item.key)}
              >
                {item.icon && <span className="sb-icon">{item.icon}</span>}
                <span className="sb-label">{item.label}</span>
                {!isOpen && childBadge > 0 ? <Badge n={childBadge} testId={`nav-badge-${item.key}`} /> : null}
                <ChevronDown size={16} className="sb-chevron" aria-hidden />
              </button>
              {isOpen && (
                <ul id={panelId} className="sb-list sb-children">
                  {item.children.map((child) => leaf(child, true))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
