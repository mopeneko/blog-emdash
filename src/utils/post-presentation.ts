import type {
	InferCollectionData,
	MediaValue,
	PortableTextBlock,
	TaxonomyTerm,
} from "emdash";
import { extractText, getReadingTime } from "./reading-time";

export interface PostTelemetry {
	readonly excerpt: string;
	readonly characterCount: number;
	readonly codeBlockCount: number;
	readonly readingMinutes: number;
}

export interface PostTag {
	readonly slug: string;
	readonly label: string;
}

export interface PostCardProps extends PostTelemetry {
	readonly title: string;
	readonly href: string;
	readonly publishedAt: Date | null;
	readonly featuredImage: MediaValue | undefined;
	readonly tags: readonly PostTag[];
}

type PostData = InferCollectionData<"posts">;

const EXCERPT_LIMIT = 160;
const LEGACY_CODE_TEXT_REGEX = /^\s*<code(?:\s|>)/i;

function extractExcerptText(content: PortableTextBlock[] | undefined): string {
	return (content ?? [])
		.filter((block) => {
			if (block._type !== "block" || block.style !== "normal" || block.listItem) {
				return false;
			}
			const text = extractText([block]).trim();
			return text && !LEGACY_CODE_TEXT_REGEX.test(text);
		})
		.map((block) => extractText([block]))
		.join(" ");
}

const postDateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

function makeExcerpt(prose: string, storedExcerpt?: string): string {
	const stored = storedExcerpt?.trim();
	if (stored) return stored;

	const normalized = prose.replace(/\s+/g, " ").trim();
	const codePoints = Array.from(normalized);
	return codePoints.length > EXCERPT_LIMIT
		? `${codePoints.slice(0, EXCERPT_LIMIT).join("")}…`
		: normalized;
}

export function getPostTelemetry(
	content: PortableTextBlock[] | undefined,
	storedExcerpt?: string,
): PostTelemetry {
	const prose = extractText(content);
	return {
		excerpt: makeExcerpt(extractExcerptText(content), storedExcerpt),
		characterCount: Array.from(prose.replace(/\s/gu, "")).length,
		codeBlockCount:
			content?.filter((block) => block._type === "code").length ?? 0,
		readingMinutes: getReadingTime(content),
	};
}

export function toPostCardProps(
	data: PostData,
	href: string,
	terms: readonly TaxonomyTerm[],
): PostCardProps {
	return {
		title: data.title,
		href,
		publishedAt: data.publishedAt,
		featuredImage: data.featured_image,
		tags: terms.map(({ slug, label }) => ({ slug, label })),
		...getPostTelemetry(data.content, data.excerpt),
	};
}

export function formatPostDate(date: Date | null | undefined): string | null {
	if (!date) return null;
	const parts = postDateFormatter.formatToParts(date);
	const year = parts.find((part) => part.type === "year")?.value;
	const month = parts.find((part) => part.type === "month")?.value;
	const day = parts.find((part) => part.type === "day")?.value;
	return `${year}.${month}.${day}`;
}
