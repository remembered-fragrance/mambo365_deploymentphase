/**
 * Bộ biểu tượng SVG nội tuyến — một họ, nét 1,75px, lưới 24px.
 *
 * KHÔNG dùng emoji làm biểu tượng: mỗi máy Android hiển thị một kiểu, và phóng
 * to ở chế độ Ngoài nắng thì vỡ. Bộ ký hiệu bốn nông sản của Tuyến sẽ thay
 * `CropIcon` khi có; hình ở đây là hình tạm nét đơn, cùng lưới nên thay được
 * mà không đổi bố cục.
 */

interface IconProps {
  readonly className?: string;
}

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const Icon = ({ className = 'h-5 w-5', d }: IconProps & { readonly d: string }) => (
  <svg className={className} {...stroke}>
    {d.split('|').map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);

export const CloseIcon = (p: IconProps) => <Icon {...p} d="M6 6l12 12|M18 6L6 18" />;
export const WarningIcon = (p: IconProps) => <Icon {...p} d="M12 4l9 16H3z|M12 10v4M12 17.5v.01" />;
export const BackspaceIcon = (p: IconProps) => (
  <Icon {...p} d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9L3 12z|M12 9l5 6M17 9l-5 6" />
);
export const KeyboardIcon = (p: IconProps) => (
  <Icon {...p} d="M3 6h18v12H3z|M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
);

export const HomeIcon = (p: IconProps) => <Icon {...p} d="M4 11l8-7 8 7|M6 10v10h12V10" />;
export const ReceiptIcon = (p: IconProps) => (
  <Icon {...p} d="M6 3h12v18l-3-2-3 2-3-2-3 2z|M9 8h6M9 12h6" />
);
export const PlusIcon = (p: IconProps) => <Icon {...p} d="M12 5v14|M5 12h14" />;
export const DebtIcon = (p: IconProps) => (
  <Icon {...p} d="M3 7h18v12H3z|M3 11h18|M16 15h2" />
);
export const MoreIcon = (p: IconProps) => (
  <Icon {...p} d="M5 12h.01|M12 12h.01|M19 12h.01" />
);
export const SunIcon = (p: IconProps) => (
  <Icon {...p} d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z|M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
);
export const MoonIcon = (p: IconProps) => <Icon {...p} d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" />;
export const ChevronRightIcon = (p: IconProps) => <Icon {...p} d="M9 5l7 7-7 7" />;
export const ChevronLeftIcon = (p: IconProps) => <Icon {...p} d="M15 5l-7 7 7 7" />;
export const FilterIcon = (p: IconProps) => <Icon {...p} d="M3 5h18l-7 8v6l-4 2v-8z" />;
export const SearchIcon = (p: IconProps) => (
  <Icon {...p} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M16.5 16.5L21 21" />
);
export const ShareIcon = (p: IconProps) => (
  <Icon {...p} d="M12 3v13|M8 7l4-4 4 4|M5 14v6h14v-6" />
);
export const PrintIcon = (p: IconProps) => (
  <Icon {...p} d="M7 9V3h10v6|M5 9h14v7H5z|M8 14h8v7H8z" />
);
export const TrashIcon = (p: IconProps) => (
  <Icon {...p} d="M4 7h16|M9 7V4h6v3|M6 7l1 14h10l1-14" />
);
export const CameraIcon = (p: IconProps) => (
  <Icon {...p} d="M4 8h3l2-2h6l2 2h3v12H4z|M12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
);
export const CheckIcon = (p: IconProps) => <Icon {...p} d="M5 13l4 4L19 7" />;
export const CloudIcon = (p: IconProps) => (
  <Icon {...p} d="M7 18a4 4 0 0 1 .6-8 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 18z" />
);
export const CloudOffIcon = (p: IconProps) => (
  <Icon {...p} d="M7 18a4 4 0 0 1 .6-8 5 5 0 0 1 9.6 1.4A3.5 3.5 0 0 1 17 18z|M4 4l16 16" />
);
export const PhoneIcon = (p: IconProps) => (
  <Icon {...p} d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
);
export const PencilIcon = (p: IconProps) => (
  <Icon {...p} d="M4 20h4L20 8l-4-4L4 16z|M14 6l4 4" />
);

/** Hình tạm cho bốn nông sản. Thay bằng bộ ký hiệu chính thức khi có. */
export const CropIcon = ({ crop, className }: IconProps & { readonly crop?: string }) => {
  const paths: Record<string, string> = {
    rubber: 'M12 4c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z',
    cashew: 'M8 15a5 5 0 0 1 4-8c3 0 4 2 4 4|M8 15c-2 0-3-1.5-3-3',
    coffee: 'M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z|M16 10h2a2 2 0 0 1 0 4h-2|M8 3v2M12 3v2',
    pepper: 'M9 20a5 5 0 0 1 0-10c3 0 6 2 8 5-2 3-5 5-8 5z|M9 10V7a3 3 0 0 1 3-3',
  };
  return <Icon className={className} d={paths[crop ?? ''] ?? 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z'} />;
};
