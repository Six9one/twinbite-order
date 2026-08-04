import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';

/**
 * The single layout shell for every product wizard.
 *
 * Replaces the copy-pasted `min-h-screen … pb-24` + `sticky top-0` header +
 * `fixed bottom-0` footer that each wizard used to carry its own slightly
 * different version of. That pattern had three problems this shell fixes:
 *
 *   1. `pb-24` was a hardcoded guess at the fixed footer's height. When the
 *      footer wrapped (long price, narrow screen, large text setting) the last
 *      option in the step ended up unreachable behind it.
 *   2. `min-h-screen` resolves to `100vh`, which on iOS Safari includes the
 *      collapsing URL bar — pushing the "Ajouter au panier" CTA below the fold.
 *   3. Wizards opened from the home page render inside a `fixed inset-0`
 *      overlay that has no scroll container of its own, so any step taller than
 *      the viewport was clipped and could not be scrolled at all.
 *
 * The fix for all three is the same: a flex column pinned to the *dynamic*
 * viewport height, with the body as the only scrollport. Header and footer are
 * flex siblings, so their real heights are always accounted for — no padding
 * guesses — and the layout behaves identically whether the wizard is rendered
 * as a full page (from CategoryMenu) or inside an overlay (from the home page).
 */
export interface WizardShellProps {
  /** Wizard title, e.g. "Tacos". Accepts nodes so wizards can keep their icon. */
  title: ReactNode;
  /** Replaces the "Étape x/y" line for wizards that aren't step-based. */
  subtitle?: ReactNode;
  /** 1-based current step. Omit (with totalSteps) for single-screen wizards. */
  step?: number;
  totalSteps?: number;
  /** Back arrow handler — usually "previous step, or close on step 1". */
  onBack: () => void;
  /**
   * When provided, shows the mobile drag handle and enables swipe-down-to-dismiss.
   * Pass the wizard's `onClose`.
   */
  onDismiss?: () => void;
  /** Rendered at the right edge of the header row (cart badge, live total, …). */
  headerRight?: ReactNode;
  /** Rendered as a full-width row under the header (filter pills, format selector, …). */
  headerExtra?: ReactNode;
  /** Sticky action bar content (price + CTA). Use `WizardPriceFooter` for the standard one. */
  footer?: ReactNode;
  /** Extra classes on the footer element itself — e.g. `md:hidden` for mobile-only bars. */
  footerClassName?: string;
  /** Optional override for the body's max width — defaults to the app column. */
  contentClassName?: string;
  children: ReactNode;
}

export function WizardShell({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  onDismiss,
  headerRight,
  headerExtra,
  footer,
  footerClassName = '',
  contentClassName = 'max-w-3xl',
  children,
}: WizardShellProps) {
  // Hook is called unconditionally (rules of hooks); the handlers are only
  // attached when the caller opted into swipe-to-dismiss.
  const { containerRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDismiss(
    onDismiss ?? (() => {})
  );

  const showProgress = typeof step === 'number' && typeof totalSteps === 'number' && totalSteps > 1;
  const swipeHandlers = onDismiss ? { onTouchStart, onTouchMove, onTouchEnd } : {};

  return (
    <div ref={containerRef} className="flex flex-col h-dvh bg-background overflow-hidden">
      <header
        className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]"
        {...swipeHandlers}
      >
        {onDismiss && (
          <div className="flex justify-center pt-2 sm:hidden cursor-grab">
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        <div className={`mx-auto w-full ${contentClassName} px-4 py-3`}>
          {/* When the wizard supplies no header-right content, reserve room on that
              side anyway: CategoryMenu floats its cart button at `top-4 right-4`
              over whatever is mounted, and without this the long titles ran
              underneath it. */}
          <div className={`flex items-center gap-3 sm:gap-4 ${headerRight ? '' : 'pr-24'}`}>
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-display font-bold truncate">{title}</h1>
              {subtitle ? (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              ) : (
                showProgress && (
                  <p className="text-sm text-muted-foreground">
                    Étape {step}/{totalSteps}
                  </p>
                )
              )}
            </div>
            {headerRight && <div className="flex-shrink-0 text-right">{headerRight}</div>}
          </div>

          {headerExtra}

          {showProgress && (
            <div className="flex gap-2 mt-3 sm:mt-4">
              {Array.from({ length: totalSteps! }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step! ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* The only scrollport. `overscroll-contain` stops the scroll chaining that
          would otherwise pull the page behind an overlay-rendered wizard. */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className={`mx-auto w-full ${contentClassName} px-4 py-6`}>{children}</div>
      </main>

      {footer && (
        <footer
          className={`flex-shrink-0 bg-background/95 backdrop-blur border-t border-border shadow-2xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${footerClassName}`}
        >
          <div className="mx-auto w-full max-w-lg">{footer}</div>
        </footer>
      )}
    </div>
  );
}

/**
 * The price + primary-action bar shared by every multi-step wizard.
 */
export function WizardPriceFooter({
  price,
  label,
  disabled = false,
  onClick,
}: {
  price: number;
  label: string;
  disabled?: boolean;
  /** Receives the click event so callers can anchor the add-to-cart toss animation to the button. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-shrink-0">
        <span className="text-xs text-muted-foreground block font-medium">Panier</span>
        <span className="text-lg sm:text-xl font-extrabold text-brand-600 dark:text-brand-400">
          {price.toFixed(2)} €
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <Button
          className="w-full h-14 text-sm sm:text-base font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-2xl shadow-lg shadow-brand-600/25 active:scale-[0.98] transition-all"
          disabled={disabled}
          onClick={onClick}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
