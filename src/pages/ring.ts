import type { APIRoute } from "astro";
import { db, Member } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const action = context.url.searchParams.get("action");
	let site = context.url.searchParams.get("from");

	console.log(action, site);

	if (!site || (action !== "prev" && action !== "next" && action !== "rand"))
		return new Response(null, { status: 400 });

	try {
		new URL(site);
	} catch (e) {
		// Add https:// to the site and try again
		try {
			new URL("https://" + site);
			site = "https://" + site;
		} catch (e) {
			return new Response("Invalid site", { status: 404 });
		}
	}

	const members = await db.select({
		site: Member.site,
		addedRingToSite: Member.addedRingToSite,
	}).from(Member);

	members.unshift({
		site: context.site?.toString() ?? "",
		addedRingToSite: true,
	});

	const fromMemberIndex = members.findIndex((member) => new URL(member.site).toString() === new URL(site).toString());

	if (fromMemberIndex < 0)
		return new Response("Invalid site", { status: 404 });

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

	return context.redirect(members[toMemberIndex]?.site ?? '', 307);
};
