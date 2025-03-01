import DOMPurify from "dompurify"
import { HTMLPurify } from ".";

export async function clientHTMLPurify(html: string, cssPrefix: string): Promise<string> {
    return await HTMLPurify(
        DOMPurify,
        html,
        cssPrefix,
        (sanitizedHtml) => new DOMParser().parseFromString(sanitizedHtml, "text/html"),
        (docObj) => Array.from(docObj.querySelectorAll("style")) as HTMLStyleElement[],
        (docObj) => docObj.documentElement.outerHTML
    )
}