export function parseYoutubeId(url) {
  const s = String(url).trim();
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

export function toEmbedUrl(url) {
  const id = parseYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export async function fetchYoutubeTitle(pageUrl) {
  const embed = toEmbedUrl(pageUrl);
  if (!embed) return null;

  const watchUrl = pageUrl.includes("http") ? pageUrl : `https://www.youtube.com/watch?v=${parseYoutubeId(pageUrl)}`;

  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.title ?? null;
}
