import fs from 'node:fs'
import { join } from 'node:path'
import { $ } from 'zx'
import {
  chromedriverDirPath,
  chromedriverPath,
  resolveChromeForTestingPlatform,
  supportedVscodeVersion,
} from '../constants/config'

const vscodeCgManifestUrl = `https://raw.githubusercontent.com/microsoft/vscode/${supportedVscodeVersion}/cgmanifest.json`
const chromeForTestingMilestonesUrl =
  'https://googlechromelabs.github.io/chrome-for-testing/latest-versions-per-milestone-with-downloads.json'

/** The major version of the Chromium that VS Code's bundled Electron ships, per its manifest. */
async function fetchChromiumMajor(): Promise<string> {
  const response = await fetch(vscodeCgManifestUrl)
  if (!response.ok) {
    throw new Error(
      `Could not fetch the VS Code manifest (${response.status}): ${vscodeCgManifestUrl}`,
    )
  }

  const manifest = (await response.json()) as {
    registrations?: { component?: { git?: { name?: string } }; version?: string }[]
  }
  const chromiumVersion = manifest.registrations?.find(
    (registration) => registration.component?.git?.name === 'chromium',
  )?.version
  if (!chromiumVersion) {
    throw new Error(`Could not find the chromium version in ${vscodeCgManifestUrl}`)
  }

  const chromiumMajor = chromiumVersion.split('.')[0]

  return chromiumMajor
}

/** The Chrome-for-Testing chromedriver download URL matching `chromiumMajor` on this host. */
async function fetchChromedriverUrl(chromiumMajor: string): Promise<string> {
  const cftPlatform = resolveChromeForTestingPlatform()
  const response = await fetch(chromeForTestingMilestonesUrl)
  if (!response.ok) {
    throw new Error(
      `Could not fetch the Chrome for Testing milestones (${response.status}): ${chromeForTestingMilestonesUrl}`,
    )
  }

  const milestones = (
    (await response.json()) as {
      milestones?: Record<
        string,
        { downloads?: { chromedriver?: { platform: string; url: string }[] } }
      >
    }
  ).milestones
  const match = milestones?.[chromiumMajor]?.downloads?.chromedriver?.find(
    (download) => download.platform === cftPlatform,
  )
  if (!match) {
    throw new Error(
      `Chrome for Testing has no chromedriver for milestone ${chromiumMajor} on "${cftPlatform}".`,
    )
  }

  return match.url
}

/**
 * Ensures a chromedriver matching VS Code's bundled Chromium is available at `chromedriverPath`,
 * downloading it from Chrome for Testing on the first run and reusing the cached binary after.
 *
 * wdio-vscode-service's own driver download is unreliable for recent VS Code builds: it reports
 * success without placing the binary at the path it then tries to launch. So the suite
 * provisions the driver itself and points `wdio:chromedriverOptions.binary` at this path.
 */
export async function provisionChromedriver(): Promise<void> {
  if (fs.existsSync(chromedriverPath)) {
    return
  }

  const chromiumMajor = await fetchChromiumMajor()
  const url = await fetchChromedriverUrl(chromiumMajor)
  const zipPath = join(chromedriverDirPath, 'chromedriver.zip')
  const extractDirPath = join(chromedriverDirPath, 'extracted')
  // Chrome for Testing nests the binary under e.g. `chromedriver-linux64/chromedriver`.
  const extractedBinaryPath = join(
    extractDirPath,
    `chromedriver-${resolveChromeForTestingPlatform()}`,
    chromedriverPath.endsWith('.exe') ? 'chromedriver.exe' : 'chromedriver',
  )

  fs.mkdirSync(chromedriverDirPath, { recursive: true })
  await $`rm -rf ${extractDirPath}`
  await $`curl -sSLf -o ${zipPath} ${url}`
  await $`unzip -q ${zipPath} -d ${extractDirPath}`
  await $`mv ${extractedBinaryPath} ${chromedriverPath}`
  await $`chmod +x ${chromedriverPath}`
  await $`rm -rf ${zipPath} ${extractDirPath}`

  if (!fs.existsSync(chromedriverPath)) {
    throw new Error(
      `chromedriver was not provisioned at the expected path: ${chromedriverPath}`,
    )
  }
}
