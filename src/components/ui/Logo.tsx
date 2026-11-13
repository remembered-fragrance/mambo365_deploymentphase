/**
 * Logo sản phẩm — `public/logo.svg` (bản gốc ở `Logo/logo.svg` ngoài repo). Đứng cạnh chữ
 * THUMUA365 nên để `alt` rỗng: trình đọc màn hình đọc tên một lần, không đọc hai.
 */
export function Logo({ className = 'h-8 w-8' }: { readonly className?: string }) {
  return <img src="/logo.svg" alt="" aria-hidden="true" width={32} height={32} className={`shrink-0 ${className}`} />;
}
