const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  viewBox: '0 0 24 24',
};

export const ChevronLeft = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} strokeWidth={2} {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const ChevronRight = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} strokeWidth={2} {...base}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const ChevronDown = () => (
  <svg width={14} height={14} strokeWidth={2.4} {...base}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const Inbox = () => (
  <svg width={20} height={20} strokeWidth={2} {...base}>
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M5 5h14l1 8v6H4v-6z" />
  </svg>
);
export const Dots = () => (
  <svg width={20} height={20} strokeWidth={2} {...base}>
    <circle cx="5" cy="12" r="1.3" />
    <circle cx="12" cy="12" r="1.3" />
    <circle cx="19" cy="12" r="1.3" />
  </svg>
);
export const Close = () => (
  <svg width={20} height={20} strokeWidth={2} {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Plus = () => (
  <svg width={22} height={22} strokeWidth={2.4} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
/** 時間軸：三條錯開的橫條（甘特圖） */
export const TimelineIcon = () => (
  <svg width={22} height={22} strokeWidth={2.2} {...base}>
    <path d="M4 6h9M8 12h12M4 18h7" />
  </svg>
);
