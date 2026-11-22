const PLATFORM_HOSTS = [
  { name: "YouTube", hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"] },
  { name: "Twitch", hosts: ["twitch.tv", "clips.twitch.tv"] },
  { name: "TikTok", hosts: ["tiktok.com"] },
  { name: "Instagram", hosts: ["instagram.com"] },
  { name: "Facebook", hosts: ["facebook.com", "fb.watch"] },
  { name: "X", hosts: ["x.com", "twitter.com"] },
  { name: "Vimeo", hosts: ["vimeo.com"] },
  { name: "Dailymotion", hosts: ["dailymotion.com", "dai.ly"] },
  { name: "Reddit", hosts: ["reddit.com", "redd.it"] },
  { name: "Kick", hosts: ["kick.com"] },
  { name: "Rumble", hosts: ["rumble.com"] },
  { name: "Streamable", hosts: ["streamable.com"] }
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(body)
  };
}

function isPrivateOrLocalHost(host) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
    const p = h.split(".").map(Number);
    if (p.some(n => n > 255)) return true;
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || p[0] >= 224;
  }
  return h.includes(":");
}

function matchesHost(host, allowed) {
  return allowed.some(domain => host === domain || host.endsWith("." + domain));
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "طريقة الطلب غير مسموحة." });
  if (!event.headers["content-type"]?.toLowerCase().includes("application/json")) {
    return json(415, { ok: false, error: "أرسل الرابط بصيغة JSON فقط." });
  }
  if (!event.body || event.body.length > 4096) return json(413, { ok: false, error: "حجم الطلب أكبر من المسموح." });

  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { ok: false, error: "بيانات الطلب غير صالحة." }); }
  if (typeof body.url !== "string" || body.url.length > 2048) {
    return json(400, { ok: false, error: "الرابط مفقود أو طويل أكثر من اللازم." });
  }

  let parsed;
  try { parsed = new URL(body.url.trim()); } catch { return json(400, { ok: false, error: "صيغة الرابط غير صحيحة." }); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) {
    return json(400, { ok: false, error: "نقبل روابط HTTPS العامة فقط، دون بيانات دخول أو منافذ مخصصة." });
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || isPrivateOrLocalHost(host) || !host.includes(".")) {
    return json(400, { ok: false, error: "تم رفض الرابط لأنه يشير إلى عنوان محلي أو غير عام." });
  }

  const platform = PLATFORM_HOSTS.find(item => matchesHost(host, item.hosts));
  if (!platform) {
    return json(422, { ok: false, error: "هذا الموقع غير موجود حاليًا في قائمة المنصات المعروفة. لم يفتح الخادم الرابط ولم يتصل به." });
  }

  // Security by design: this endpoint parses and classifies the URL only.
  // It never fetches the submitted URL, follows redirects, executes content, or downloads remote files.
  return json(200, {
    ok: true,
    platform: platform.name,
    message: "الرابط آمن من ناحية الصيغة والنطاق المعروف: " + platform.name +
      ". لم يتم تنزيل الفيديو بعد؛ نحتاج ربط واجهة الاستيراد الرسمية/المصرح بها لهذه المنصة قبل إدخاله للمحرر."
  });
};
