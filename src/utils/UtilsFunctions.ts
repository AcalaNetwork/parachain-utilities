export const replaceText = (
  key: string,
  value: string,
  options: { ns: string; replace: Record<string, string> }
): string => {
  if (options.replace) {
    let newValue = value
    for (const key in options.replace) {
      newValue = newValue.replace(`{{${key}}}`, options.replace[key])
    }
    return newValue
  }
  return value || key
}
