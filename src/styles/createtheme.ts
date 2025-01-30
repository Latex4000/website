import type { Value } from "nottheme";

// This type castings are to make it easier to tell which values are for light and dark themes
type LightValue = Value;
type DarkValue = Value;

type LightDarkValue = [LightValue, DarkValue];
type cssVariableValue = Value | LightDarkValue;

interface RequiredValues {
    "--line-height": cssVariableValue;
    "--border-thickness": cssVariableValue;
    "--background-color": cssVariableValue;
    "--background-color-alt": cssVariableValue;
    "--text-color": cssVariableValue;
    "--text-color-alt": cssVariableValue;
    "--srclink": cssVariableValue;
    "--srctext": cssVariableValue;
    "--srcopacity": cssVariableValue;
}

type ThemeValues = Record<string, cssVariableValue>;

const isNotLightDarkValue = (values: Record<string, cssVariableValue>): values is Record<string, Value> => {
    for (const value of Object.values(values))
        if (Array.isArray(value))
            return false;
    return true;
}

export default function createTheme(
    themeName: string,
    requiredValues: RequiredValues,
    themeValues: ThemeValues = {}
): {
    names: string[],
    values: Record<string, Record<string, Value>>
} {
    const allVars: Record<string, cssVariableValue> = { ...requiredValues, ...themeValues }

    if (isNotLightDarkValue(allVars))
        return {
            names: [themeName],
            values: {
                [themeName]: allVars,
            }
        }

    const lightValues: Record<string, LightValue> = {};
    const darkValues: Record<string, DarkValue> = {};

    for (const [key, value] of Object.entries({ ...requiredValues, ...themeValues })) {
        if (Array.isArray(value)) {
            lightValues[key] = value[0];
            darkValues[key] = value[1];
        } else {
            lightValues[key] = value;
            darkValues[key] = value;
        }
    }

    return {
        names: [`${themeName}-light`, `${themeName}-dark`],
        values: {
            [`${themeName}-light`]: lightValues,
            [`${themeName}-dark`]: darkValues,
        }
    }
}