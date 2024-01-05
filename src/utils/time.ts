import TimeAgo, { type LabelStyleName, type Style } from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

// TODO: maninak add JSDocs with example outputs

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

export function getFormattedDate(unixTimestamp: number, locale?: string): string {
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
