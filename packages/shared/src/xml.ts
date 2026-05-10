export const escapeXmlAttributeValue = (value: string) =>
  value
    .replaceAll(`&`, `&amp;`)
    .replaceAll(`"`, `&quot;`)
    .replaceAll(`'`, `&apos;`)
    .replaceAll(`<`, `&lt;`)
    .replaceAll(`>`, `&gt;`)
