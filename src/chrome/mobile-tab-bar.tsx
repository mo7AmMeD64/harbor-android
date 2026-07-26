import { useState } from "react";
import { X, EllipsisVertical } from "lucide-react";
import { NAV_ITEMS, applyNavCustomization, type NavItem } from "@/chrome/nav-items";
import { useView, type View } from "@/lib/view";
import { useSettings } from "@/lib/settings";
import { useParental } from "@/lib/parental";
import { useActiveKid } from "@/lib/profiles";
import { useT } from "@/lib/i18n";
import { ParentalPinModal } from "@/components/parental-pin-modal";

// Kept small on purpose — a phone bottom bar only has room for ~5 thumb-reach
// targets. Everything else lives behind "More". Order chosen for the most
// common phone flows: browse -> discover -> downloads -> settings.
const PRIMARY_MOBILE_IDS = ["home", "discover", "downloads", "settings"];

/**
 * ANDROID FORK: mobile replacement for Sidebar/DraculaSidebar/NordSidebar/
 * etc. Those are all desktop nav-chrome themes (a vertical icon rail or a
 * top dock) that don't fit a phone screen — this is a plain bottom tab bar
 * instead, reusing the same NAV_ITEMS/customization/parental-lock logic so
 * behavior stays consistent with desktop.
 */
export function MobileTabBar() {
  const { view, setView, chromeHidden } = useView();
  const { locked, unlock, hiddenTabs } = useParental();
  const { settings } = useSettings();
  const kid = useActiveKid();
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingPinView, setPendingPinView] = useState<View | null>(null);

  if (chromeHidden) return null;

  const items = applyNavCustomization(NAV_ITEMS, settings.navCustomization);
  const isVisible = (item: NavItem) => {
    if (kid) return item.view === "kids";
    if (item.view === "kids") return false;
    if (item.view === "vod" && !settings.showPlaylistsTab) return false;
    if (item.hideKey && settings.hideContent[item.hideKey]) return false;
    if (locked && item.parentalKey && hiddenTabs[item.parentalKey]) return false;
    return true;
  };
  const visible = items.filter(isVisible);
  const primary = PRIMARY_MOBILE_IDS.map((id) => visible.find((it) => it.id === id)).filter(
    (it): it is NavItem => !!it,
  );
  const rest = visible.filter((it) => !primary.includes(it));

  const go = (item: NavItem) => {
    const gated = !!item.pinGated && locked;
    if (gated) setPendingPinView(item.view);
    else setView(item.view);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        data-tv-nav-zone
        data-harbor-mobile-tabbar
        className="fixed inset-x-0 bottom-0 z-[60] flex items-stretch justify-around border-t border-edge-soft bg-canvas/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map((item) => {
          const active = view === item.view;
          return (
            <button
              key={item.id}
              type="button"
              data-harbor-nav={item.view}
              data-active={active ? "" : undefined}
              onClick={() => go(item)}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] ${
                active ? "text-accent" : "text-ink-muted"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center">{item.render(active)}</span>
              <span className="truncate px-1">{t(item.label)}</span>
            </button>
          );
        })}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] text-ink-muted"
          >
            <span className="flex h-6 w-6 items-center justify-center">
              <EllipsisVertical size={20} />
            </span>
            <span className="truncate px-1">{t("chrome.more")}</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/50"
          onClick={() => setMoreOpen(false)}
        >
          <div
            data-harbor-mobile-more-sheet
            className="w-full rounded-t-2xl border-t border-edge-soft bg-canvas p-4"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-medium text-ink">{t("chrome.more")}</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1.5 text-ink-subtle hover:bg-elevated/60"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {rest.map((item) => {
                const gated = !!item.pinGated && locked;
                const active = view === item.view;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] active:bg-elevated/60 ${
                      active ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center">
                      {item.render(active)}
                      {gated && (
                        <span className="absolute -bottom-1 -end-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-canvas text-ink-subtle ring-1 ring-edge">
                          <svg viewBox="0 0 24 24" width="8" height="8" fill="currentColor">
                            <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 0 1 6 0v3Z" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span className="truncate">{t(item.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {pendingPinView && (
        <ParentalPinModal
          mode={{
            kind: "unlock",
            onUnlock: () => {
              const v = pendingPinView;
              setPendingPinView(null);
              if (v) setView(v);
            },
            onCancel: () => setPendingPinView(null),
          }}
          verify={unlock}
        />
      )}
    </>
  );
}
