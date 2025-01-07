export async function GET() {
    return new Response(
        `const members = await fetch('https://latex4000.neocities.org/members.json').then(res => res.json());
const membersInRing = members.filter(member => member.addedRingToSite);
let currentIndex = membersInRing.findIndex(member => member.aliasEncoded === document.currentScript.dataset.alias.toLowerCase());
if (currentIndex === -1)
    return;
document.getElementById('latex4000Prev').href = membersInRing[(currentIndex - 1 + membersInRing.length) % membersInRing.length].site;
document.getElementById('latex4000Random').href = membersInRing[Math.floor(Math.random() * membersInRing.length)].site;
document.getElementById('latex4000Next').href = membersInRing[(currentIndex + 1) % membersInRing.length].site;`
    );
}