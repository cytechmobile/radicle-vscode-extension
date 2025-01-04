import { browser } from '@wdio/globals'
import type { OutputView } from 'wdio-vscode-service'

describe('Httpd', () => {
  it('receives success responses from httpd', async () => {
    const workbench = await browser.getWorkbench()
    await workbench.executeCommand('Show Everything Logged in the Output Panel')
    const outputView = await workbench.getBottomBar().openOutputView()

    await expectOutputToContain(outputView, 'Using already unsealed Radicle identity')
  })
})

async function expectOutputToContain(outputView: OutputView, expected: string) {
  await browser.waitUntil(
    async () => {
      /**
       * The text in the output console is split by newlines, which can be affected by the size
       * of the window. To avoid this, we join the text into a single string.
       */
      const joinedText = (await outputView.getText()).join('')
      console.log({ joinedText })

      return joinedText.includes(expected)
    },
    {
      timeoutMsg: `expected the output text to contain "${expected}"`,
    },
  )
}
