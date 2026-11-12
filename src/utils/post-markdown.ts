import {
	DefaultHorizontalRuleRenderer,
	DefaultImageRenderer,
	DefaultLinkRenderer,
	portableTextToMarkdown,
	type PortableTextTypeRenderer,
} from "@portabletext/markdown";
import type { PortableTextBlock } from "emdash";

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value ? value : undefined;
}

function imageRenderer(url: URL): PortableTextTypeRenderer {
	return (options) => {
		const { value } = options;
		const asset = value.asset;
		const storageKey = nonEmptyString(asset?.meta?.storageKey);
		const id = nonEmptyString(asset?._ref) ?? nonEmptyString(asset?.id);
		const src = nonEmptyString(value.src) ?? nonEmptyString(asset?.url) ??
			nonEmptyString(asset?.src) ??
			(storageKey || id ? `/_emdash/api/media/file/${storageKey ?? id}` : undefined);
		if (!src) return "";

		const imageUrl = URL.parse(src, url);
		if (!imageUrl || !["http:", "https:"].includes(imageUrl.protocol)) return "";

		return DefaultImageRenderer({
			...options,
			value: {
				_type: "image",
				src: imageUrl.href.replaceAll("(", "%28").replaceAll(")", "%29"),
				alt: nonEmptyString(value.alt) ?? nonEmptyString(asset?.alt),
				title: nonEmptyString(value.title),
			},
		});
	};
}

export function renderPostMarkdown(title: string, content: PortableTextBlock[], url: URL): string {
	const heading = {
		_type: "block",
		_key: "post-title",
		style: "h1",
		children: [{ _type: "span", _key: "title", text: title.replace(/[\r\n]+/g, " ") }],
	};
	return portableTextToMarkdown([heading, ...content], {
		types: {
			image: imageRenderer(url),
			break: DefaultHorizontalRuleRenderer,
			divider: DefaultHorizontalRuleRenderer,
			youtube: ({ value, ...options }) => {
				const videoId = nonEmptyString(value.videoId);
				if (!videoId) return "";

				return DefaultLinkRenderer({
					...options,
					text: "",
					children: "YouTube",
					markKey: undefined,
					markType: "link",
					value: {
						_type: "link",
						href: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
						title: nonEmptyString(value.title),
					},
				});
			},
		},
	}).trimEnd() + "\n";
}
