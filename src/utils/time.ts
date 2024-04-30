import TimeAgo, { type LabelStyleName, type Style } from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

/**
 * Returns the time elapsed since the provided `unixTimestamp` till now.
 *
 * It tries to reduce collisions/duplicates by *not* rounding up to the nearest
 * unit as soon as possible. E.g. if 32 days have ellapsed it will
 * show "32d" instead of ~~"1mo"~~.
 *
 * See implementation for more explicit information on behaviour.
 *
 * @default 'long'
 * @param {('long' | 'short' | 'narrow' | 'mini' | 'now')} labelStyle the preferred style in which the output will be
 * @see https://github.com/catamphetamine/javascript-time-ago/tree/master/locale-more-styles
 */
export function getTimeAgo(
  unixTimestamp: number,
  labelStyle: LabelStyleName = 'long',
): string {
  const customTimeAgoStyle: Omit<Style, 'labels'> = {
    steps: [
      { formatAs: 'now' },
      { minTime: 60, formatAs: 'minute' },
      { minTime: 60 * 60, formatAs: 'hour' },
      { minTime: 60 * 60 * 24 * 2, formatAs: 'day' },
      { minTime: 60 * 60 * 24 * 365, formatAs: 'year' },
    ],
  }

  return timeAgo.format(unixTimestamp * 1000, { ...customTimeAgoStyle, labels: [labelStyle] })
}

/**
 * Returns a full datetiem (without seconds) in a non-standard, easy to read and short
 * format
 *
 * The time is in the local timezone which, again for optimal UX, is referenced by name instead
 * of by offset from UTC, implying to the reader "yes, that's adjusted for the clock on
 * your wrist".
 *
 * If a locale in BCP47LocaleIdentifier is provided, then the date will be i18n'd to also
 * use the localized format familiar to that locale.
 *
 * @example
 * ```ts
 * getFormattedDate(Date.now()) // Fri, Apr 26, 2024, 10:00 AM Serbia Time
 * ```
 *
 * @example
 * ```ts
 * getFormattedDate(Date.now(), 'de-AT') // Fr., 26. Apr. 2024, 10:00 MEZ
 * ```
 */
export function getFormattedDate(
  unixTimestamp: number,
  locale?: Parameters<Date['toLocaleDateString']>['0'],
): string {
  return new Date(unixTimestamp * 1000).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'shortGeneric',
  })
}

/**
 * Converts a locale from the libc format to the BCP47 standard.
 */
export function convertLocaleFromLibcToBcp47(
  libc?: string,
): Intl.UnicodeBCP47LocaleIdentifier | undefined {
  // glibc locales follow the format
  //
  //     language[_territory[.codeset]][@modifier]
  //
  // For primitive conversion to BCP47 we discard `codeset` and `modifier`
  // (including their respective prefixes `.` and `@`) and replace
  // `_` by `-`. This is wrong, but works fairly well.
  //
  // See https://www.gnu.org/software/libc/manual/html_node/Locale-Names.html
  //
  // The proper (but complicated) way of doing this right is described in
  // https://wikinew.openoffice.org/wiki/LocaleMapping
  return libc?.replace(/(\.|@).*/, '').replace('_', '-')
}
