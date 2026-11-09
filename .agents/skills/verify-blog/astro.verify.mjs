import cloudflare from "@astrojs/cloudflare";
import baseConfig from "../../../astro.config.mjs";

const stateDir = process.env.BLOG_VERIFY_STATE;
if (!stateDir) {
	throw new Error("BLOG_VERIFY_STATE must name a disposable verification directory");
}

export default {
	...baseConfig,
	adapter: cloudflare({ persistState: { path: stateDir } }),
};
