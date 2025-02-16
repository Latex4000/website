import type { AstroIntegration } from "astro";

export default function db(): AstroIntegration {
    return {
        name: "latex4000:db",
        hooks: {
            "astro:server:setup": async ({ server, logger }) => {
                logger.info("Seeding database");

                const seedModule = await server.ssrLoadModule("src/database/seed.ts");
                await seedModule.default();

                logger.info("Done seeding");
            },
        },
    };
}
