import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Film,
  Heart,
  List,
  ShoppingBasket,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
export const iconMap: Record<string, LucideIcon> = {
  list: List,
  basket: ShoppingBasket,
  book: BookOpen,
  film: Film,
  star: Star,
  briefcase: BriefcaseBusiness,
  heart: Heart,
};
export function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <Check size={19} strokeWidth={2.4} />
      </span>
      Organize
    </span>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const prev = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (prev instanceof HTMLElement && prev.isConnected) prev.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="sheet-head">
        <h2 id={id}>{title}</h2>
        <button className="icon-btn" aria-label="Fechar" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={22} />
      </span>
      <strong>{title}</strong>
      {body && <p>{body}</p>}
    </div>
  );
}
export function Header({
  subtitle,
  title,
  action,
  back,
}: {
  subtitle?: string;
  title: string;
  action?: ReactNode;
  back?: () => void;
}) {
  return (
    <header className="page-head">
      <div>
        {back && (
          <button className="back-link" onClick={back}>
            <ArrowLeft size={16} /> Voltar
          </button>
        )}
        {subtitle && <p className="page-date">{subtitle}</p>}
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
export function Alert({ text }: { text: string }) {
  return text ? (
    <p className="alert" role="alert">
      {text}
    </p>
  ) : null;
}
