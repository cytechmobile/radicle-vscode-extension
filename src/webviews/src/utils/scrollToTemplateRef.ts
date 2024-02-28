import type { ComponentPublicInstance, MaybeRef } from 'vue'
import { unrefElement } from '@vueuse/core'

export function scrollToTemplateRef(
  templateRef?: MaybeRef<ComponentPublicInstance> | MaybeRef<HTMLElement | SVGElement>,
  options?: { classToAdd: string; removeAfterMs: number },
) {
  const el = unrefElement(templateRef)
  if (!el) {
    console.warn('Cannot scrollToTemplateRef for undefined element')
    return
  }

  el.scrollIntoView({ block: 'center', behavior: 'smooth' })

  if (options?.classToAdd) {
    el.classList.add(options.classToAdd)
    options?.removeAfterMs !== undefined &&
      setTimeout(() => el.classList.remove(options.classToAdd), options.removeAfterMs)
  }
}
