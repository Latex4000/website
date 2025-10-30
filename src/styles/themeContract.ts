const layout = [
    "--layout-header-margin-block",
    "--layout-footer-font-scale",
    "--layout-max-width",
    "--layout-padding-inline",
    "--sidebar-max-width",
    "--home-grid-margin-block-start",
    "--home-grid-row-gap",
    "--home-grid-width",
    "--sights-grid-margin-block-start",
    "--media-cover-size-lg",
    "--media-cover-size-md",
    "--media-cover-size-sm",
    "--media-cover-size-xs",
    "--media-video-width",
    "--media-video-height",
] as const;

const spacing = [
    "--space-2xs",
    "--space-xs",
    "--space-sm",
    "--space-md",
    "--space-lg",
    "--space-inline-sm",
    "--space-inline-md",
    "--space-static-xs",
    "--space-static-sm",
    "--space-static-md",
] as const;

const typography = [
    "--line-height",
    "--font-size-sm",
    "--font-size-lg",
] as const;

const borders = [
    "--border-thickness",
    "--border-thickness-thin",
    "--border-thickness-thick",
    "--border-radius-sm",
    "--border-radius-md",
] as const;

const surfaces = [
    "--background-color",
    "--background-color-alt",
    "--text-color",
    "--text-color-alt",
    "--border-color-muted",
    "--surface-overlay",
    "--surface-overlay-strong",
    "--text-on-overlay",
] as const;

const viz = [
    "--viz-grid",
    "--viz-axis",
    "--viz-focus",
    "--viz-series-palette",
    "--viz-sequential-ramp",
] as const;

const feedback = [
    "--feedback-accent",
    "--feedback-helpful",
    "--feedback-harmful",
    "--feedback-neutral",
    "--feedback-arrow",
] as const;

const meta = ["--webring-prev-icon", "--webring-next-icon", "--srclink", "--srctext"] as const;

export const themeContract = {
    layout,
    spacing,
    typography,
    borders,
    surfaces,
    viz,
    feedback,
    meta,
} as const;

export const requiredCssKeys = [
    ...layout,
    ...spacing,
    ...typography,
    ...borders,
    ...surfaces,
    ...viz,
    ...feedback,
    ...meta,
] as const;

export type RequiredCssKey = (typeof requiredCssKeys)[number];
