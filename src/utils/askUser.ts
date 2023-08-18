import { type Disposable, type InputBoxOptions, QuickInputButtons, window } from 'vscode'
import type { ArrayMinLength, Prettify } from '../types'
import { log } from './log'

export type Question = Prettify<
  {
    /**
     * The key that will be used to identify the answer matching this question.
     *
     * PRE-CONDITIONS:
     * - must be unique among all other questions of the same flow
     */
    key: string
    /**
     * The kind of the question being defined. Each kind comes with its own unique
     * UI/UX that will be used when shown to the user.
     *
     * @example
     * - 'text' will show a simple text input
     * - 'single-select' and 'multi-select' will show filterable list of available options
     */
    kind: 'text' // '| 'single-select' | 'multi-select'` to be implemented later, replacing QuickPick API
  } & Omit<InputBoxOptions, 'valueSelection'>
>

const FLOW_INTERRUPT = {
  BACKTRACK: 'BACKTRACK',
  CANCEL: 'CANCEL',
} as const

/**
 * Launches a flow of 1-N questions shown in succession to the user for which they can input
 * their answer. Provides a cohesive experience indicating total step count and completion
 * progress, as well as allowing editing of already submitted answers of the same flow.
 *
 * Wraps the native
 * [InputBox API](https://code.visualstudio.com/api/references/vscode-api#InputBox), the
 * use of which results in procedural, verbose and brittle client code.
 *
 * @example
 * ```ts
 * const answers = await askUser([
 *   {
 *     key: 'username',
 *     validateInput: (input) => input ? undefined : 'The input cannot be empty.',
 *     kind: 'text',
 *   },
 *   { key: 'password', password: true, kind: 'text' },
 * ])
 * if (!answers) { return }
 * const { username, password } = answers
 * ```
 *
 * PRE-CONDITIONS:
 * - at least one question is provided
 *
 * POST-CONDITIONS:
 * - the count of answers is equivalent to the count of questions
 * - questions will be asked in the order they are provided
 * - all answers are trimmed of leading and trailing whitespaces
 *
 */
export async function askUser<
  const Q extends Question,
  Questions extends ArrayMinLength<Q, 1>,
  K extends Questions[number]['key'],
>(questions: Questions): Promise<Record<K, string> | undefined> {
  const answers: Record<PropertyKey, string> = {}
  const disposables: Disposable[] = []

  let qIndex = 0
  let question = questions[0]
  while (qIndex < questions.length) {
    const inputBox = window.createInputBox()
    disposables.push(inputBox)

    try {
      const answer = await new Promise<string>((resolve, reject) => {
        if (questions.length > 1) {
          inputBox.totalSteps = questions.length
          inputBox.step = qIndex + 1
        }
        inputBox.title = question.title
        inputBox.prompt = question.prompt
        inputBox.placeholder = question.placeHolder
        inputBox.value = answers[question.key] ?? question.value ?? ''
        inputBox.password = Boolean(question.password)
        inputBox.ignoreFocusOut = Boolean(question.ignoreFocusOut)
        inputBox.buttons = qIndex > 0 ? [QuickInputButtons.Back] : []
        inputBox.onDidChangeValue(
          async (newVal) => {
            inputBox.validationMessage =
              (await question.validateInput?.(newVal.trim())) ?? undefined
          },
          null,
          disposables,
        )
        inputBox.onDidAccept(
          async () => {
            inputBox.enabled = false
            inputBox.busy = true
            const trimmedValue = inputBox.value.trim()
            if (!(await question.validateInput?.(trimmedValue))) {
              resolve(trimmedValue)
            }
            inputBox.enabled = true
            inputBox.busy = false
          },
          undefined,
          disposables,
        )
        inputBox.onDidTriggerButton(
          (button) => {
            if (button === QuickInputButtons.Back) {
              reject(FLOW_INTERRUPT.BACKTRACK)
            }
          },
          undefined,
          disposables,
        )
        inputBox.onDidHide(
          () => {
            reject(FLOW_INTERRUPT.CANCEL)
          },
          undefined,
          disposables,
        )
        inputBox.show()
      })

      answers[question.key] = answer

      qIndex++
      question = questions[qIndex] as Q
    } catch (error) {
      if (error === FLOW_INTERRUPT.BACKTRACK) {
        qIndex--
        question = questions[qIndex] as Q
      } else if (error === FLOW_INTERRUPT.CANCEL) {
        return undefined
      } else {
        log(
          `No case handling thrown error ${
            error instanceof Error ? `: "${error.message}"` : ''
          }`,
          'error',
          'requestUserInput()',
        )
        console.error(error)
      }
    } finally {
      disposables.forEach((disposable) => {
        disposable.dispose()
      })
    }
  }

  return answers
}
