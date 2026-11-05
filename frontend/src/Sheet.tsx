import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
  onDismiss: () => void;
  busy?: boolean;
  kind?: "form" | "preview" | "inspector" | "navigation";
};

export function Sheet({
  children,
  onDismiss,
  busy = false,
  kind = "form",
}: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const beganOutside = useRef(false);
  const origin = useRef(document.activeElement as HTMLElement | null);
  const dismiss = useRef(onDismiss);
  const pending = useRef(busy);
  dismiss.current = onDismiss;
  pending.current = busy;

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".app");
    if (root) root.inert = true;
    const dialog = layer.current?.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    const preferred = dialog?.querySelector<HTMLElement>("[data-autofocus]");
    (preferred || focusable()[0] || dialog)?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if ((event.target as Element)?.closest("[data-folio-menu]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!pending.current) dismiss.current();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.removeEventListener("keydown", keyboard, true);
      if (root) root.inert = false;
      if (origin.current?.isConnected) origin.current.focus();
      else {
        const selector =
          kind === "inspector"
            ? '[aria-label="展开参考资料与结果"]'
            : kind === "navigation"
              ? '[aria-label="展开对话列表"]'
              : null;
        if (selector) document.querySelector<HTMLElement>(selector)?.focus();
      }
    };
  }, []);

  return createPortal(
    <div
      ref={layer}
      className={`sheet-layer sheet-${kind}`}
      onPointerDown={(event) => {
        beganOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (
          beganOutside.current &&
          event.target === event.currentTarget &&
          !pending.current
        )
          dismiss.current();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
