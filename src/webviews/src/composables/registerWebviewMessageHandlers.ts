import { useEventListener } from '@vueuse/core'
import { useCounterStore } from '@/stores/counter'
import type { notifyWebview } from 'lib/webview-messaging'
import { assertUnreachable } from 'utils/assertUnreachable'

/**
 * Registers a handler for each possible message the extension can post to the webview.
 */
export function registerWebviewMessageHandlers() {
  useEventListener(
    window,
    'message',
    (event: MessageEvent<Parameters<typeof notifyWebview>['0']>) => {
      const message = event.data

      switch (message.command) {
        case 'resetCount':
          useCounterStore().reset()
          break
        default:
          assertUnreachable(message.command)
      }
    }
  )
}
