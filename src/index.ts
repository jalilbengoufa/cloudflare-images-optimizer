/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return handleRequest(request);
	},
};

// addEventListener('fetch', (event: FetchEvent) => {
// 	event.respondWith(handleRequest(event.request));
// });

type FIT_TYPE = 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
type FORMAT_TYPE = 'avif' | 'webp' | 'json' | 'jpeg' | 'png';
type OUTPUT_TYPE = 'thumbnail' | 'small' | 'medium' | 'large';

const ALLOWED_SOURCE_ORIGINS = ['images.unsplash.com'];

//TEST IMAGE https://images.unsplash.com/photo-1682687218147-9806132dc697

const OUTPUT_SIZES: { [key in OUTPUT_TYPE]: number } = {
	thumbnail: 150,
	small: 320,
	medium: 640,
	large: 1024,
};

interface ImageOptions {
	cf: {
		image: {
			fit?: FIT_TYPE;
			width?: number;
			height?: number;
			quality?: number;
			format?: FORMAT_TYPE;
		};
	};
}

async function handleRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const options: ImageOptions = { cf: { image: {} } };

	const outputType = url.searchParams.get('type');
	const quality = url.searchParams.get('quality');
	const fit = url.searchParams.get('fit');

	if (fit) {
		options.cf.image.fit = fit as FIT_TYPE;
	}

	if (outputType) {
		const size = OUTPUT_SIZES[outputType as OUTPUT_TYPE];
		options.cf.image.width = size;
		options.cf.image.height = size;
	}

	if (quality) {
		options.cf.image.quality = parseInt(quality, 10);
	}

	const accept = request.headers.get('Accept');
	if (accept && /image\/avif/.test(accept)) {
		options.cf.image.format = 'avif';
	} else if (accept && /image\/webp/.test(accept)) {
		options.cf.image.format = 'webp';
	}

	let imageURL = url.searchParams.get('image');
	if (!imageURL) return new Response('Missing "image" value', { status: 400 });
	imageURL = decodeURIComponent(imageURL);

	try {
		const { hostname } = new URL(imageURL);
		if (ALLOWED_SOURCE_ORIGINS.includes(hostname)) {
			return new Response('Invalid source image URL', { status: 403 });
		}
	} catch (err) {
		return new Response('Invalid "image URL" value', { status: 400 });
	}

	const imageRequest = new Request(imageURL, {
		headers: request.headers,
	});

	return fetch(imageRequest, options);
}
