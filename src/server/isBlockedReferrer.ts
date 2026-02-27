
const BLOCKED_REFERRER_HOSTS = [
    "muloves.ru",
    "dom2-fany.ru",
];

export default function isBlockedReferrerHost(host: string): boolean {
    return BLOCKED_REFERRER_HOSTS.some((blocked) =>
        host === blocked || host.endsWith(`.${blocked}`),
    );
}