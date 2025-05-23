import postcss from "postcss";
import prefixer from 'postcss-prefix-selector';

export async function prefixCSSSelectors(cssText: string, prefix: string) {
    const result = await postcss([
        prefixer({
            prefix,
            transform(_prefix, _selector, prefixedSelector) {
                if (_selector.startsWith(_prefix))
                    return _selector;
                return prefixedSelector;
            }
        })
    ]).process(cssText, { from: undefined });

    return result.css;
}