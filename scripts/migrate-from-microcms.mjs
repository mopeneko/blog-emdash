#!/usr/bin/env node
// microCMS → EmDash seed.json 変換スクリプト
//
// 使い方:
//   npm i -D node-html-parser
//   MICROCMS_SERVICE=ey4c25mu1w \
//   MICROCMS_API_KEY=xxxxx \
//   node scripts/migrate-from-microcms.mjs \
//     --out=seed/seed.microcms.json
//
// microCMSのエンドポイント名（既知）: post / product / tag / pages
// 別名の場合は --post=xxx --product=xxx --tag=xxx --pages=xxx で上書き可。
//
// 出力は seed.json と同形式。`npx emdash seed <out> --validate` で検証可。

import { parse } from "node-html-parser";
import fs from "node:fs/promises";
import path from "node:path";

// ---------- args ----------
const args = Object.fromEntries(
	process.argv.slice(2).map((a) => {
		const [k, ...rest] = a.replace(/^--/, "").split("=");
		return [k, rest.join("=") || true];
	}),
);

const SERVICE = process.env.MICROCMS_SERVICE;
const API_KEY = process.env.MICROCMS_API_KEY;
if (!SERVICE || !API_KEY) {
	console.error("MICROCMS_SERVICE and MICROCMS_API_KEY env vars are required");
	process.exit(1);
}

const ENDPOINTS = {
	post: args.post || "post",
	product: args.product || "product",
	tag: args.tag || "tag",
	pages: args.pages || "pages",
};
const OUT = args.out || "seed/seed.microcms.json";

// ---------- microCMS client ----------
const BASE = `https://${SERVICE}.microcms.io/api/v1`;

async function fetchAll(endpoint) {
	const out = [];
	const limit = 100;
	let offset = 0;
	while (true) {
		const url = `${BASE}/${endpoint}?limit=${limit}&offset=${offset}`;
		const res = await fetch(url, { headers: { "X-MICROCMS-API-KEY": API_KEY } });
		if (!res.ok) {
			throw new Error(`${endpoint}: ${res.status} ${await res.text()}`);
		}
		const json = await res.json();
		out.push(...(json.contents || []));
		if (out.length >= (json.totalCount ?? 0)) break;
		offset += limit;
	}
	return out;
}

// ---------- HTML → Portable Text ----------
// microCMSのrich-textを構造化ブロックに変換する。
// 主な対応: p / h2-h6 / blockquote / pre>code / figure>img / img / a / strong / em / br / lite-youtube
// 広告タグ（<ins class="adsbygoogle">, <script>）は削除。

let keyCounter = 0;
const nextKey = () => `k${(++keyCounter).toString(36)}`;

function textOf(node) {
	return (node.rawText || node.text || "")
		.replace(/&nbsp;/g, " ")
		.replace(/\u00a0/g, " ");
}

function stripAdsAndScripts(root) {
	// 広告を含むdivだけアンラップ対象にする（先にマークしてから<ins>を削除）
	const adWrappers = new Set();
	root.querySelectorAll("ins.adsbygoogle").forEach((ins) => {
		const parent = ins.parentNode;
		if (parent && parent.rawTagName === "div") adWrappers.add(parent);
	});
	root.querySelectorAll("ins.adsbygoogle, script, style").forEach((n) => n.remove());
	for (const div of adWrappers) {
		const heading = div.querySelector("h1, h2, h3, h4, h5, h6");
		if (heading) {
			div.replaceWith(heading);
		} else {
			div.remove();
		}
	}
}

// インライン要素 → spans with marks
function collectSpans(node, marks, markDefs) {
	const out = [];
	for (const child of node.childNodes) {
		if (child.nodeType === 3) {
			const t = textOf(child);
			if (t) out.push({ _type: "span", _key: nextKey(), text: t, marks: [...marks] });
			continue;
		}
		if (child.nodeType !== 1) continue;
		const tag = child.rawTagName?.toLowerCase();
		if (tag === "br") {
			const last = out[out.length - 1];
			if (last) last.text += "\n";
			continue;
		}
		if (tag === "strong" || tag === "b") {
			out.push(...collectSpans(child, [...marks, "strong"], markDefs));
			continue;
		}
		if (tag === "em" || tag === "i") {
			out.push(...collectSpans(child, [...marks, "em"], markDefs));
			continue;
		}
		if (tag === "code") {
			out.push(...collectSpans(child, [...marks, "code"], markDefs));
			continue;
		}
		if (tag === "a") {
			const href = child.getAttribute("href");
			if (!href) {
				out.push(...collectSpans(child, marks, markDefs));
				continue;
			}
			const key = nextKey();
			markDefs.push({ _type: "link", _key: key, href });
			out.push(...collectSpans(child, [...marks, key], markDefs));
			continue;
		}
		// 未知のインライン要素は中身のテキストだけ取る
		out.push(...collectSpans(child, marks, markDefs));
	}
	return out;
}

function imageBlock(img) {
	const src = img.getAttribute("src");
	if (!src) return null;
	const width = toInt(img.getAttribute("width"));
	const height = toInt(img.getAttribute("height"));
	return {
		_type: "image",
		_key: nextKey(),
		alt: img.getAttribute("alt") || "",
		asset: {
			url: src,
			...(width ? { width } : {}),
			...(height ? { height } : {}),
		},
	};
}

function toInt(v) {
	const n = parseInt(v || "", 10);
	return Number.isFinite(n) ? n : undefined;
}

function textBlock(style, node) {
	const markDefs = [];
	const children = collectSpans(node, [], markDefs);
	if (children.length === 0) return null;
	const block = { _type: "block", _key: nextKey(), style, children };
	if (markDefs.length) block.markDefs = markDefs;
	return block;
}

function htmlToPortableText(html) {
	if (!html) return [];
	// microCMS は `<lite-youtube videoid="...">` を HTMLエンティティでエスケープ+段落ラップして
	// 保存する（例: `<p>&lt;lite-youtube videoid=&quot;X&quot;&gt;</p>`）。
	// パース前にマーカー `<p data-lite-youtube="ID">` に置き換えておく。
	// 1) 段落まるごとラップされたエンティティ形式
	html = html.replace(
		/<p>\s*&lt;lite-youtube\b[^&]*?\bvideoid=&quot;([^&"']+)&quot;[^&]*?&gt;[\s\S]*?<\/p>/gi,
		(_, id) => `<p data-lite-youtube="${id}"></p>`,
	);
	// 2) 裸のエンティティ形式（段落外に出現した場合）
	html = html.replace(
		/&lt;lite-youtube\b[^&]*?\bvideoid=&quot;([^&"']+)&quot;[^&]*?&gt;(?:[\s\S]*?&lt;\/lite-youtube&gt;)?/gi,
		(_, id) => `<p data-lite-youtube="${id}"></p>`,
	);
	// 3) 生のHTML要素として存在している場合（未エスケープ）
	html = html.replace(
		/<lite-youtube\b[^>]*?\bvideoid=["']([^"']+)["'][^>]*?>(?:\s*<\/lite-youtube\s*>)?/gi,
		(_, id) => `<p data-lite-youtube="${id}"></p>`,
	);
	const root = parse(`<div>${html}</div>`, { lowerCaseTagName: true });
	stripAdsAndScripts(root);

	const blocks = [];
	const topChildren = root.firstChild?.childNodes || [];

	for (const node of topChildren) {
		if (node.nodeType === 3) {
			// top-level text node
			const t = textOf(node).trim();
			if (t) {
				blocks.push({
					_type: "block",
					_key: nextKey(),
					style: "normal",
					children: [{ _type: "span", _key: nextKey(), text: t, marks: [] }],
				});
			}
			continue;
		}
		if (node.nodeType !== 1) continue;
		const tag = node.rawTagName?.toLowerCase();

		if (tag === "p") {
			const ytId = node.getAttribute("data-lite-youtube");
			if (ytId) {
				blocks.push({ _type: "youtube", _key: nextKey(), videoId: ytId });
				continue;
			}
			const b = textBlock("normal", node);
			if (b) blocks.push(b);
			continue;
		}
		if (/^h[1-6]$/.test(tag || "")) {
			const b = textBlock(tag, node);
			if (b) blocks.push(b);
			continue;
		}
		if (tag === "blockquote") {
			// blockquoteの中は複数の<p>になるので段落ごとにstyle=blockquoteで出す
			const inner = node.querySelectorAll(":scope > p");
			const targets = inner.length > 0 ? inner : [node];
			for (const p of targets) {
				const b = textBlock("blockquote", p);
				if (b) blocks.push(b);
			}
			continue;
		}
		if (tag === "pre") {
			const code = node.querySelector("code");
			const text = (code || node).text;
			blocks.push({
				_type: "code",
				_key: nextKey(),
				code: text,
				language: code?.getAttribute("class")?.match(/lang(?:uage)?-(\w+)/)?.[1] || "",
			});
			continue;
		}
		if (tag === "figure") {
			const img = node.querySelector("img");
			if (img) {
				const b = imageBlock(img);
				if (b) blocks.push(b);
			}
			const cap = node.querySelector("figcaption");
			if (cap) {
				const b = textBlock("normal", cap);
				if (b) blocks.push(b);
			}
			continue;
		}
		if (tag === "img") {
			const b = imageBlock(node);
			if (b) blocks.push(b);
			continue;
		}
		if (tag === "lite-youtube") {
			const videoId = node.getAttribute("videoid");
			if (videoId) {
				blocks.push({ _type: "youtube", _key: nextKey(), videoId });
			}
			continue;
		}
		if (tag === "ul" || tag === "ol") {
			const listItem = tag === "ul" ? "bullet" : "number";
			for (const li of node.querySelectorAll(":scope > li")) {
				const markDefs = [];
				const children = collectSpans(li, [], markDefs);
				if (children.length === 0) continue;
				const block = {
					_type: "block",
					_key: nextKey(),
					style: "normal",
					listItem,
					level: 1,
					children,
				};
				if (markDefs.length) block.markDefs = markDefs;
				blocks.push(block);
			}
			continue;
		}
		if (tag === "hr") {
			blocks.push({ _type: "divider", _key: nextKey() });
			continue;
		}
		// 未対応タグは段落として扱う
		const b = textBlock("normal", node);
		if (b) blocks.push(b);
	}
	return blocks;
}

// ---------- 変換 ----------

function mcImage(v) {
	if (!v) return undefined;
	if (typeof v === "string") return v;
	if (v.url) return v.url;
	return undefined;
}


// microCMSの確定スキーマに基づく変換。
// - post:    title / slug / content(HTML) / thumbnail(image) / product(ref) / tags(ref[]) / published_at / updated_at
// - product: name / manufacture / image / links[]
// - tag:     name
// - pages:   title / slug / content(HTML) / published_at / updated_at

function entrySlug(item) {
	return item.slug || item.id;
}

function toProductEntry(item) {
	const title = item.name || item.id;
	const maker = item.manufacture || "";
	const image = mcImage(item.image);
	const links = (Array.isArray(item.links) ? item.links : [])
		.map((l) => ({ label: l.text || "", url: l.url || "" }))
		.filter((l) => l.url);

	return {
		id: `product-${item.id}`,
		slug: item.id,
		status: "published",
		data: {
			title,
			maker,
			...(image ? { image } : {}),
			links,
		},
	};
}

function toTagTerm(item) {
	return {
		slug: item.id,
		label: item.name || item.id,
	};
}

function toPostEntry(post) {
	const tags = (Array.isArray(post.tags) ? post.tags : [])
		.map((t) => (typeof t === "string" ? t : t.id))
		.filter(Boolean);

	const productId = post.product
		? typeof post.product === "string"
			? post.product
			: post.product.id
		: null;

	const entry = {
		id: `post-${post.id}`,
		slug: entrySlug(post),
		status: "published",
		data: {
			title: post.title || post.id,
			content: htmlToPortableText(post.content || ""),
			...(mcImage(post.thumbnail) ? { featured_image: mcImage(post.thumbnail) } : {}),
			...(productId ? { product: `$ref:product-${productId}` } : {}),
		},
	};
	if (tags.length) entry.taxonomies = { tag: tags };
	return entry;
}

function toPageEntry(page) {
	return {
		id: `page-${page.id}`,
		slug: entrySlug(page),
		status: "published",
		data: {
			title: page.title || page.id,
			content: htmlToPortableText(page.content || ""),
		},
	};
}

// seed投入後に実行する日付上書きSQLを生成する。
// EmDashのビルトイン published_at / updated_at / created_at カラム（ec_<slug>テーブル）
// を、microCMSのオリジナル値で書き換える。
function buildDateOverrideSQL(collectionSlug, items) {
	const table = `ec_${collectionSlug}`;
	const lines = [`-- Override built-in date columns for ${table} from microCMS values`];
	for (const item of items) {
		const published = item.published_at;
		const updated = item.updated_at;
		if (!published && !updated) continue;
		const sets = [];
		if (published) {
			sets.push(`published_at = ${sqlStr(published)}`);
			sets.push(`created_at = ${sqlStr(published)}`);
		}
		if (updated) sets.push(`updated_at = ${sqlStr(updated)}`);
		const slug = item.slug || item.id;
		lines.push(`UPDATE ${table} SET ${sets.join(", ")} WHERE slug = ${sqlStr(slug)};`);
	}
	return lines.join("\n") + "\n";
}

function sqlStr(v) {
	return `'${String(v).replace(/'/g, "''")}'`;
}

// ---------- main ----------
async function main() {
	console.log(`Fetching from ${BASE} ...`);

	const [postsRaw, productsRaw, tagsRaw, pagesRaw] = await Promise.all([
		fetchAll(ENDPOINTS.post).catch((e) => {
			console.warn(`post fetch failed: ${e.message}`);
			return [];
		}),
		fetchAll(ENDPOINTS.product).catch((e) => {
			console.warn(`product fetch failed: ${e.message}`);
			return [];
		}),
		fetchAll(ENDPOINTS.tag).catch((e) => {
			console.warn(`tag fetch failed: ${e.message}`);
			return [];
		}),
		fetchAll(ENDPOINTS.pages).catch((e) => {
			console.warn(`pages fetch failed: ${e.message}`);
			return [];
		}),
	]);

	console.log(`  post: ${postsRaw.length}`);
	console.log(`  product: ${productsRaw.length}`);
	console.log(`  tag: ${tagsRaw.length}`);
	console.log(`  pages: ${pagesRaw.length}`);

	const seed = {
		$schema: "https://emdashcms.com/seed.schema.json",
		version: "1",
		meta: { name: "Imported from microCMS", description: `Service: ${SERVICE}` },
		collections: [
			{
				slug: "posts",
				label: "Posts",
				labelSingular: "Post",
				supports: ["drafts", "revisions", "search", "seo"],
				fields: [
					{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
					{ slug: "featured_image", label: "Featured Image", type: "image" },
					{ slug: "content", label: "Content", type: "portableText", searchable: true },
					{ slug: "excerpt", label: "Excerpt", type: "text" },
					{ slug: "product", label: "Product", type: "reference", options: { collection: "products" } },
				],
			},
			{
				slug: "products",
				label: "Products",
				labelSingular: "Product",
				supports: ["search"],
				fields: [
					{ slug: "title", label: "Product", type: "string", required: true, searchable: true },
					{ slug: "maker", label: "Maker", type: "string" },
					{ slug: "image", label: "Image", type: "image" },
					{ slug: "links", label: "Links", type: "json" },
				],
			},
			{
				slug: "pages",
				label: "Pages",
				labelSingular: "Page",
				supports: ["drafts", "search"],
				fields: [
					{ slug: "title", label: "Title", type: "string", required: true, searchable: true },
					{ slug: "content", label: "Content", type: "portableText", searchable: true },
				],
			},
		],
		taxonomies: [
			{
				name: "tag",
				label: "Tags",
				labelSingular: "Tag",
				hierarchical: false,
				collections: ["posts"],
				terms: tagsRaw.map(toTagTerm),
			},
		],
		// NOTE: productsをpostsより先に列挙する。seed applyは content を挿入順で
		// 処理するため、$refの解決にはreference先が先に作られている必要がある。
		content: {
			products: productsRaw.map(toProductEntry),
			posts: postsRaw.map(toPostEntry),
			pages: pagesRaw.map(toPageEntry),
		},
	};

	const outPath = path.resolve(OUT);
	await fs.mkdir(path.dirname(outPath), { recursive: true });
	await fs.writeFile(outPath, JSON.stringify(seed, null, 2));
	console.log(`wrote ${outPath}`);

	// 日付をビルトインカラムに反映するSQLを出力
	const sqlPath = outPath.replace(/\.json$/, ".dates.sql");
	const sql = [
		buildDateOverrideSQL("posts", postsRaw),
		buildDateOverrideSQL("pages", pagesRaw),
	].join("\n");
	await fs.writeFile(sqlPath, sql);
	console.log(`wrote ${sqlPath}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
