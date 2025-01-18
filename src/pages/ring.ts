import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const action = context.url.searchParams.get("action");
	const alias = context.url.searchParams.get("from");

	if (!alias || (action !== "prev" && action !== "next" && action !== "rand")) {
		return new Response(null, { status: 400 });
	}

	const members = [
		{
			alias: "Latex 4000",
			site: context.site?.toString() ?? "",
		},
		...await getMembers(),
	];

	const fromMemberIndex = members.findIndex((member) => member.alias === alias);

	if (fromMemberIndex < 0) {
		return new Response("Invalid alias", { status: 404 });
	}

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

// TEMP
interface Member {
	alias: string;
	site: string;
	addedRingToSite: boolean;
}

// TEMP
function getMembers(): Promise<Member[]> {
	return fetch("https://nonacademic.net/members.json")
		.then((response) => response.json())
		.then((members: Member[]) => members.filter((member) => member.addedRingToSite));
}
