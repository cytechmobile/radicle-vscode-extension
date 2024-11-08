import type { ComponentPublicInstance, MaybeRef } from 'vue'
import { unrefElement } from '@vueuse/core'

export function scrollToTemplateRef(
  templateRef?: MaybeRef<ComponentPublicInstance> | MaybeRef<HTMLElement | SVGElement> | null,
  options?: {
    addClass?: { class: string; removeAfterMs: number }
    scrollIntoViewOptions?: Parameters<HTMLElement['scrollIntoView']>[0]
  },
) {
  const el = unrefElement(templateRef)
  if (!el) {
    console.warn('Cannot scrollToTemplateRef for undefined element')
    return
  }

  el.scrollIntoView(options?.scrollIntoViewOptions ?? { block: 'center', behavior: 'smooth' })

  if (options?.addClass?.class) {
    el.classList.add(options.addClass.class)
    options.addClass.removeAfterMs !== undefined &&
      setTimeout(
        () => el.classList.remove(options.addClass?.class || ''),
        options.addClass.removeAfterMs,
      )
  }
}
