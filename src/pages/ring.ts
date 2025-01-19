import type { APIRoute } from "astro";
import { db, eq, Member } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const action = context.url.searchParams.get("action");
	const alias = context.url.searchParams.get("from");

	if (!alias || (action !== "prev" && action !== "next" && action !== "rand"))
		return new Response(null, { status: 400 });

	const members = await db.select({
		alias: Member.alias,
		site: Member.site,
	})
		.from(Member)
		.where(eq(Member.addedRingToSite, true));

	members.unshift({
		alias: "Latex 4000",
		site: context.site?.toString() ?? "",
	});

	const fromMemberIndex = members.findIndex((member) => member.alias === alias);

	if (fromMemberIndex < 0)
		return new Response("Invalid alias", { status: 404 });

	let toMemberIndex: number;

	switch (action) {
		case "prev":
			toMemberIndex = (fromMemberIndex - 1 + members.length) % members.length;
			break;
		case "next":
			toMemberIndex = (fromMemberIndex + 1) % members.length;
			break;
		case "rand":
			toMemberIndex = Math.floor(Math.random() * (members.length - 1));
			if (toMemberIndex >= fromMemberIndex) {
				toMemberIndex++;
			}
			break;
	}

	return context.redirect(members[toMemberIndex]!.site, 307);
};
