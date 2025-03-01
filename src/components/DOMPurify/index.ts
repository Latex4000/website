import { type Config, type DOMPurify } from "dompurify"
import { prefixCSSSelectors } from "../postcss";

const DOMPurifyConfig: Config = { FORCE_BODY: true, ADD_TAGS: ["style"] }

export async function HTMLPurify<T>(
    DOMPurify: DOMPurify,
    html: string,
    cssPrefix: string,
    parseHTML: (sanitizedHtml: string) => T,
    extractStyleElements: (docObj: T) => { textContent: string | null }[],
    htmlSerialize: (docObj: T) => string
): Promise<string> {
    const sanitized = DOMPurify.sanitize(html, DOMPurifyConfig);
    // Find style tags and prefix their selectors, no jsdom because this is client-side
    const dom = parseHTML(sanitized);
    const styleTags = extractStyleElements(dom);
    for (const styleTag of styleTags) {
        if (!styleTag.textContent) continue;
        styleTag.textContent = await prefixCSSSelectors(styleTag.textContent, cssPrefix);
    }
    return htmlSerialize(dom);
}