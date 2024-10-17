import * as path from 'node:path'
import Mocha from 'mocha'
import glob from 'glob'

export async function run(): Promise<unknown> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
  })

  const testsRoot = path.resolve(__dirname, '..')

  return new Promise<void>((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err: Error | null, files: string[]) => {
      if (err) {
        reject(err)

        return
      }

      // Add files to the test suite
      files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)))

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`))
          } else {
            resolve()
          }
        })
      } catch (err) {
        console.error(err)
        reject(err)
      }
    })
  })
}
