type DnsRecordType =
    | "A"
    | "AAAA"
    | "CAA"
    | "CNAME"
    | "MX"
    | "NS"
    | "SOA"
    | "SRV"
    | "TXT";

// Valid for at least A and TXT
interface DnsRecord {
    id: number;
    type: DnsRecordType;
    name: string;
    data: string;
    ttl: number;
}

async function apiRequest<T = void>(url: string | URL, init?: RequestInit, ok?: (response: Response) => boolean): Promise<T> {
    if (!process.env.DIGITALOCEAN_DNS_TOKEN) {
        throw new Error("DIGITALOCEAN_DNS_TOKEN not set");
    }

    const response = await fetch(new URL(url, "https://api.digitalocean.com"), {
        ...init,
        headers: {
            Authorization: `Bearer ${process.env.DIGITALOCEAN_DNS_TOKEN}`,
            "Content-Type": "application/json",
        },
    });

    ok ??= (response) => response.ok;
    if (ok(response)) {
        return response.json().catch(() => undefined);
    }

    throw new Error(`Error from DigitalOcean:\n${await response.json()}`);
}

export async function getRecords(options: { name?: string, type?: DnsRecordType }): Promise<DnsRecord[]> {
    const url = new URL("/v2/domains/nonacademic.net/records");

    if (options.name != null) {
        url.searchParams.set("name", options.name);
    }

    if (options.type != null) {
        url.searchParams.set("type", options.type);
    }

    const response = await apiRequest<{ domain_records: DnsRecord[] }>(url);

    return response.domain_records;
}

export async function createOrUpdateRecord(options: Pick<DnsRecord, "data" | "name" | "type">): Promise<DnsRecord> {
    const existingRecords = await getRecords(options);
    const existingRecordId = existingRecords[0]?.id;

    const url = new URL("/v2/domains/nonacademic.net/records");

    if (existingRecordId != null) {
        url.pathname += `/${existingRecordId}`;
    }

    const response = await apiRequest<{ domain_record: DnsRecord }>(url, {
        method: existingRecordId == null ? "POST" : "PUT",
    });

    return response.domain_record;
}

export function deleteRecord(recordId: number): Promise<void> {
    return apiRequest(`/v2/domains/nonacademic.net/records/${recordId}`, {
        method: "DELETE",
    }, (response) => response.ok || response.status === 404);
}
