import DOMPurify from "dompurify"
import { JSDOM } from 'jsdom';
import { HTMLPurify } from ".";

export async function serverHTMLPurify(html: string, cssPrefix: string): Promise<string> {
    return await HTMLPurify(
        DOMPurify(new JSDOM('').window),
        html,
        cssPrefix,
        (sanitizedHtml) => new JSDOM(sanitizedHtml),
        (docObj) => Array.from(docObj.window.document.querySelectorAll("style")) as HTMLStyleElement[],
        (docObj) => docObj.serialize()
    )
}