const TIME_ONLY_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/;
const TIME_ONLY_ISO_REGEX =
  /^1970-01-01T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?Z$/;

const pad = (value, length = 2) => String(value).padStart(length, "0");

const buildUtcTimeDate = (hours, minutes, seconds = 0, milliseconds = 0) =>
  new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds, milliseconds));

export const buildLocalTimePayload = (date = new Date()) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.${pad(date.getMilliseconds(), 3)}`;

export const buildLocalSessionDatePayload = (date = new Date()) =>
  new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  ).toISOString();

export const formatSessionTime = (
  value,
  { locale = "ar-EG", fallback = "--:--" } = {}
) => {
  if (!value) return fallback;

  const timeValue = String(value).trim();
  const timeOnlyMatch = TIME_ONLY_REGEX.exec(timeValue);
  if (timeOnlyMatch) {
    const [, hoursText, minutesText, secondsText, millisecondsText] =
      timeOnlyMatch;
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(
      buildUtcTimeDate(
        Number(hoursText),
        Number(minutesText),
        secondsText ? Number(secondsText) : 0,
        millisecondsText ? Number(millisecondsText.padEnd(3, "0")) : 0
      )
    );
  }

  const timeOnlyIsoMatch = TIME_ONLY_ISO_REGEX.exec(timeValue);
  if (timeOnlyIsoMatch) {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(new Date(timeValue));
  }

  const parsedDate = new Date(timeValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
};
