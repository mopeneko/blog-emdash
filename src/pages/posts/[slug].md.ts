import type { APIRoute } from "astro";
import { decodeSlug, getEmDashEntry } from "emdash";
import { renderPostMarkdown } from "../../utils/post-markdown";

export const GET: APIRoute = async ({ params, url, cache }) => {
	const slug = decodeSlug(params.slug);
	if (!slug) return new Response(null, { status: 404 });

	const { entry: post, isPreview, error, cacheHint } = await getEmDashEntry("posts", slug);
	if (error) return new Response(null, { status: 500 });
	if (!post || isPreview || post.data.status !== "published") {
		return new Response(null, { status: 404 });
	}

	cache.set(cacheHint);
	return new Response(renderPostMarkdown(post.data.title, post.data.content ?? [], url), {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
};
