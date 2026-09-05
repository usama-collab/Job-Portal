import DOMPurify from "dompurify";

const hasMarkup = (value: string) => /<\/?[a-z][^>]*>/i.test(value);

export function descriptionHtml(value: string): string {
  if (!hasMarkup(value)) {
    const element = document.createElement("div");
    element.textContent = value;
    return `<p>${element.innerHTML.replace(/\r?\n/g, "<br>")}</p>`;
  }
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}

export function descriptionText(value: string): string {
  if (!hasMarkup(value)) return value;
  const element = document.createElement("div");
  element.innerHTML = descriptionHtml(value).replace(/<\/(p|h2|h3|li)>|<br\s*\/?\s*>/gi, "$& ");
  return element.textContent?.trim() || "";
}
