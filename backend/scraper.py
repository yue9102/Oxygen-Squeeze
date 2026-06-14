"""
Multi-platform podcast scraper.
Supports: 小宇宙 (xiaoyuzhoufm.com), Apple Podcasts, generic OG-tag pages.
"""
import re
import json
import xml.etree.ElementTree as ET
import httpx
from models import EpisodeMeta

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


async def scrape_episode(url: str) -> EpisodeMeta:
    """Route to the right scraper based on URL domain."""
    if "xiaoyuzhoufm.com" in url:
        return await _scrape_xiaoyuzhou(url)
    if "podcasts.apple.com" in url or "itunes.apple.com" in url:
        return await _scrape_apple(url)
    # Fallback: generic OG tags
    return await _scrape_generic(url)


# ── 小宇宙 ──────────────────────────────────────────────────

async def _scrape_xiaoyuzhou(url: str) -> EpisodeMeta:
    from bs4 import BeautifulSoup

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    def og(prop: str) -> str:
        tag = soup.find("meta", property=f"og:{prop}")
        return (tag.get("content") or "").strip() if tag else ""

    title = og("title") or (soup.title.string.strip() if soup.title else "") or "未知标题"
    description = og("description") or ""
    podcast_name = og("site_name") or ""
    duration = None
    audio_url = og("audio") or ""   # 小宇宙页面通常有 og:audio

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                if not podcast_name and "partOfSeries" in data:
                    podcast_name = data["partOfSeries"].get("name", "")
                if not description and "description" in data:
                    description = data["description"]
                if "duration" in data:
                    duration = data["duration"]
                # 音频直链：associatedMedia.contentUrl 或 contentUrl
                if not audio_url:
                    media = data.get("associatedMedia") or {}
                    audio_url = media.get("contentUrl") or data.get("contentUrl") or ""
        except Exception:
            pass

    if " - " in title and not podcast_name:
        parts = title.rsplit(" - ", 1)
        if len(parts) == 2:
            title, podcast_name = parts[0].strip(), parts[1].strip()

    if not podcast_name or podcast_name in ("小宇宙",):
        podcast_name = "未知播客"

    if not description:
        raise ValueError("未能获取播客内容描述，请检查链接是否有效")

    return EpisodeMeta(url=url, podcast_name=podcast_name, title=title,
                       description=description, duration=duration, audio_url=audio_url or None)


# ── Apple Podcasts ──────────────────────────────────────────

async def _scrape_apple(url: str) -> EpisodeMeta:
    """
    Apple Podcasts URL format:
      https://podcasts.apple.com/cn/podcast/{name}/id{podcast_id}?i={episode_id}

    Strategy:
      1. Extract podcast_id from URL
      2. Call iTunes API to get RSS feed URL
      3. Fetch RSS and find the episode (by track ID if available, else latest)
    """
    podcast_id_match = re.search(r"/id(\d+)", url)
    episode_id_match = re.search(r"[?&]i=(\d+)", url)

    if not podcast_id_match:
        raise ValueError("无法从 Apple Podcasts 链接中解析播客 ID")

    podcast_id = podcast_id_match.group(1)
    episode_id = episode_id_match.group(1) if episode_id_match else None

    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
        # 拉取该播客的节目列表（含每集的 trackId），用于按 i= 精确匹配
        lookup = (
            f"https://itunes.apple.com/lookup?id={podcast_id}"
            f"&country=cn&media=podcast&entity=podcastEpisode&limit=200"
        )
        resp = await client.get(lookup)
        resp.raise_for_status()
        results = resp.json().get("results", [])

        collection = next((r for r in results if r.get("wrapperType") == "collection"), {})
        episodes = [r for r in results if r.get("wrapperType") == "podcastEpisode"]
        feed_url = collection.get("feedUrl", "")

        # 按 trackId 精确匹配用户分享的那一集
        target = None
        if episode_id:
            target = next((e for e in episodes if str(e.get("trackId")) == episode_id), None)
        # 找不到（或链接没带 i=）才退回最新一集
        if target is None and episodes:
            target = episodes[0]

        if target is None:
            raise ValueError("未能在 iTunes 找到该节目，请确认链接有效")

        # 播客名：优先集合信息，否则用这一集自带的 collectionName
        podcast_name = (collection.get("collectionName")
                        or collection.get("trackName")
                        or target.get("collectionName")
                        or "未知播客")

        title = target.get("trackName") or "未知标题"
        description = re.sub(r"<[^>]+>", "", target.get("description") or "").strip()

        # 时长：trackTimeMillis → H:MM:SS
        duration = None
        ms = target.get("trackTimeMillis")
        if isinstance(ms, int) and ms > 0:
            s = ms // 1000
            h, m, sec = s // 3600, (s % 3600) // 60, s % 60
            duration = f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"

        # iTunes 描述太短时，用 RSS 里同名那集的正文补全（仅补描述，标题仍用精确匹配的）
        if len(description) < 60 and feed_url:
            try:
                rss = await client.get(feed_url, headers={"User-Agent": HEADERS["User-Agent"]})
                root = ET.fromstring(rss.text)
                ns = {"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"}
                for item in root.findall(".//item"):
                    if (item.findtext("title") or "").strip() == title.strip():
                        body = (item.findtext("itunes:summary", namespaces=ns)
                                or item.findtext("description") or "")
                        body = re.sub(r"<[^>]+>", "", body).strip()
                        if len(body) > len(description):
                            description = body
                        break
            except Exception:
                pass

    if not description:
        description = title  # 至少让 AI 有标题可分析

    # 音频直链：iTunes 的 podcastEpisode 直接带 episodeUrl
    audio_url = target.get("episodeUrl") or target.get("previewUrl")

    return EpisodeMeta(url=url, podcast_name=podcast_name, title=title,
                       description=description, duration=duration, audio_url=audio_url)


# ── Generic fallback ────────────────────────────────────────

async def _scrape_generic(url: str) -> EpisodeMeta:
    from bs4 import BeautifulSoup

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    def og(prop: str) -> str:
        tag = soup.find("meta", property=f"og:{prop}")
        return (tag.get("content") or "").strip() if tag else ""

    title = og("title") or (soup.title.string.strip() if soup.title else "") or "未知标题"
    description = og("description") or ""
    site_name = og("site_name") or "未知播客"

    if not description:
        raise ValueError(f"未能从该链接获取内容描述，目前支持：小宇宙、Apple Podcasts")

    return EpisodeMeta(url=url, podcast_name=site_name,
                       title=title, description=description)
