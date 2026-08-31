const LOCAL_WEB_ORIGIN = 'http://localhost:3000'

export function fixImageUrl(
  url: string | null | undefined,
  developmentHost: string,
): string | undefined {
  if (!url) return undefined

  if (url.startsWith(LOCAL_WEB_ORIGIN)) {
    return url.replace(LOCAL_WEB_ORIGIN, `http://${developmentHost}:3000`)
  }

  return url
}
