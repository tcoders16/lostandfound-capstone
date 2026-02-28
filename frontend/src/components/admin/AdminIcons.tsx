// src/components/admin/AdminIcons.tsx
// All SVG icons used in the admin panel — consistent 20×20 viewport

type IconProps = { size?: number; color?: string; strokeWidth?: number };
const d = (props: IconProps) => ({
  width:  props.size ?? 18,
  height: props.size ?? 18,
  fill:   "none",
  viewBox: "0 0 24 24",
  stroke: props.color ?? "currentColor",
  strokeWidth: props.strokeWidth ?? 1.75,
  strokeLinecap: "round"  as const,
  strokeLinejoin: "round" as const,
});

export function IconDashboard(p: IconProps) {
  return (
    <svg {...d(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

export function IconUpload(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

export function IconBox(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
    </svg>
  );
}

export function IconMatch(p: IconProps) {
  return (
    <svg {...d(p)}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
      <path d="M8 11h6M11 8v6"/>
    </svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

export function IconX(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}

export function IconArrowLeft(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <svg {...d(p)}>
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  );
}

export function IconMail(p: IconProps) {
  return (
    <svg {...d(p)}>
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
    </svg>
  );
}

export function IconCpu(p: IconProps) {
  return (
    <svg {...d(p)}>
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"/>
    </svg>
  );
}

export function IconFilter(p: IconProps) {
  return (
    <svg {...d(p)}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

export function IconPin(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <svg {...d(p)}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <svg {...d(p)}>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}
