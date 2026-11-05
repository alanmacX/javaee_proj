import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

/** Shared, viewport-clamped picker: no browser-native popup or clipped menus. */
export function GlassSelect({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 0,
  });
  const [active, setActive] = useState(0);
  const selected = options.findIndex((option) => option.value === value);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function show(last = false) {
    if (disabled || !options.length) return;
    setActive(last ? options.length - 1 : Math.max(0, selected));
    setOpen(true);
  }
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const gap = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--space-2",
        ),
      );
      const tokens = getComputedStyle(document.documentElement);
      const minWidth = parseFloat(
        tokens.getPropertyValue("--layout-menu-min-width"),
      );
      const maxMenuHeight = parseFloat(
        tokens.getPropertyValue("--layout-menu-max-height"),
      );
      const width = Math.min(
        Math.max(rect.width, minWidth),
        window.innerWidth - gap * 2,
      );
      const above = rect.top - gap * 2;
      const below = window.innerHeight - rect.bottom - gap * 2;
      const height = Math.min(
        menu.current?.scrollHeight || maxMenuHeight,
        maxMenuHeight,
      );
      const up = below < height && above > below;
      const maxHeight = Math.max(
        0,
        Math.min(maxMenuHeight, up ? above : below),
      );
      setPosition({
        left: Math.max(
          gap,
          Math.min(rect.left, window.innerWidth - width - gap),
        ),
        top: up
          ? rect.top - Math.min(height, maxHeight) - gap
          : rect.bottom + gap,
        width,
        maxHeight,
      });
    };
    place();
    menu.current?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) place();
    };
    document.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", scroll, true);
    };
  }, [open, position.width]);
  useLayoutEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="glass-select"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            show(event.key === "ArrowUp");
          }
        }}
      >
        <span>{options[selected]?.label || label}</span>
        <ChevronDown size="var(--icon-sm)" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id}
            data-folio-menu
            role="listbox"
            tabIndex={0}
            className="glass-menu"
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            style={position}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setOpen(false);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (["Escape", "Tab"].includes(event.key)) {
                event.preventDefault();
                close();
              } else if (
                ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                setActive((index) =>
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? options.length - 1
                      : (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          options.length) %
                        options.length,
                );
              } else if (["Enter", " "].includes(event.key)) {
                event.preventDefault();
                close();
                onChange(options[active].value);
              } else if (event.key.length === 1) {
                const next = options.findIndex((option) =>
                  option.label
                    .toLocaleLowerCase()
                    .startsWith(event.key.toLocaleLowerCase()),
                );
                if (next >= 0) setActive(next);
              }
            }}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={`glass-menu-option ${index === active ? "active" : ""}`}
                onPointerMove={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  close();
                  onChange(option.value);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size="var(--icon-md)" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
