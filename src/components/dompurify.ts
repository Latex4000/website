import DOMPurify, { type Config } from "dompurify"
import { JSDOM } from 'jsdom';
import { prefixCSSSelectors } from "./postcss";

export const DOMPurifyConfig: Config = { FORCE_BODY: true, ADD_TAGS: ["style"] }

export async function htmlPurify(html: string, cssPrefix: string, isSSR: boolean): Promise<string> {
    const sanitized = DOMPurify(isSSR ? new JSDOM('').window : undefined).sanitize(html, DOMPurifyConfig);
    // Find style tags and prefix their selectors
    const dom = new JSDOM(sanitized);
    const styleTags = Array.from(dom.window.document.querySelectorAll("style")) as HTMLStyleElement[];
    for (const styleTag of styleTags) {
        if (!styleTag.textContent) continue;
        styleTag.textContent = await prefixCSSSelectors(styleTag.textContent, cssPrefix);
    }
    return dom.serialize();
}