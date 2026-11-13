/** The two representations this site produces. Order is the server preference used to break ties. */
const REPRESENTATIONS = ["text/html", "text/markdown"] as const;
type Representation = (typeof REPRESENTATIONS)[number];

export type Negotiation =
	| { readonly kind: "representation"; readonly mediaType: Representation }
	| { readonly kind: "not-acceptable" };

const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

type MediaRange = {
	type: string;
	subtype: string;
	quality: number;
};

function parseQuality(parameters: readonly string[]): number {
	const parameter = parameters.find((value) => /^\s*q\s*=/i.test(value));
	if (parameter === undefined) return 1;
	const value = Number(parameter.slice(parameter.indexOf("=") + 1).trim());
	if (!Number.isFinite(value)) return 0;
	return Math.min(Math.max(value, 0), 1);
}

function parseAccept(header: string): MediaRange[] {
	const ranges: MediaRange[] = [];
	for (const entry of header.split(",")) {
		const [range, ...parameters] = entry.split(";");
		const [type, subtype] = (range ?? "").trim().toLowerCase().split("/");
		if (!type || !subtype) continue;
		ranges.push({ type, subtype, quality: parseQuality(parameters) });
	}
	return ranges;
}

function matchSpecificity(range: MediaRange, type: string, subtype: string): number {
	if (range.subtype === "*") return range.type === "*" ? 1 : range.type === type ? 2 : 0;
	if (range.type === "*") return range.subtype === subtype ? 2 : 0;
	return range.type === type && range.subtype === subtype ? 3 : 0;
}

function effectiveQuality(candidate: Representation, ranges: readonly MediaRange[]): number {
	const [type, subtype] = candidate.split("/");
	let quality = 0;
	let specificity = 0;
	for (const range of ranges) {
		const level = matchSpecificity(range, type, subtype);
		if (level === 0 || level < specificity) continue;
		if (level === specificity && range.quality <= quality) continue;
		quality = range.quality;
		specificity = level;
	}
	return quality;
}

export function negotiate(acceptHeader: string | null): Negotiation {
	if (acceptHeader === null || acceptHeader.trim() === "") {
		return { kind: "representation", mediaType: "text/html" };
	}

	const ranges = parseAccept(acceptHeader);
	let winner: Representation | null = null;
	let winnerQuality = 0;
	for (const representation of REPRESENTATIONS) {
		const quality = effectiveQuality(representation, ranges);
		if (quality > winnerQuality) {
			winner = representation;
			winnerQuality = quality;
		}
	}

	if (winner === null) return { kind: "not-acceptable" };
	return { kind: "representation", mediaType: winner };
}

export function markdownResponse(body: BodyInit | null, init?: ResponseInit): Response {
	const headers = new Headers(init?.headers);
	headers.set("Content-Type", MARKDOWN_CONTENT_TYPE);
	headers.set("Vary", "Accept");
	return new Response(body, { ...init, headers });
}

export function notAcceptableResponse(acceptHeader: string | null): Response {
	const sent =
		acceptHeader === null
			? "クライアントは Accept ヘッダーを送信していません。"
			: `クライアントが送信したヘッダー: Accept: ${acceptHeader}`;
	const body = `このリソースは text/html または text/markdown でのみ提供しています。\n\n${sent}\n`;
	return new Response(body, {
		status: 406,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			Vary: "Accept",
			"Cache-Control": "no-store",
		},
	});
}

export function renderNotFoundMarkdown(url: URL): string {
	return [
		"# 404 Not Found",
		"",
		`\`${url.pathname}\` は見つかりませんでした。`,
		"",
		`- [トップページ](${url.origin}/)`,
		`- [記事一覧](${url.origin}/posts)`,
		"",
	].join("\n");
}
