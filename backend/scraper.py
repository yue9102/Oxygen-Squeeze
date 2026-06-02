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

    return EpisodeMeta(url=url, podcast_name=podcast_name,
                       title=title, description=description, duration=duration)


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
    episode_id = re.search(r"[?&]i=(\d+)", url)

    if not podcast_id_match:
        raise ValueError("无法从 Apple Podcasts 链接中解析播客 ID")

    podcast_id = podcast_id_match.group(1)

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        # Step 1: get RSS feed URL from iTunes
        itunes_url = f"https://itunes.apple.com/lookup?id={podcast_id}&country=cn"
        resp = await client.get(itunes_url)
        resp.raise_for_status()
        itunes_data = resp.json()

        podcast_info = next(
            (r for r in itunes_data.get("results", []) if r.get("wrapperType") == "collection"),
            itunes_data.get("results", [{}])[0] if itunes_data.get("results") else {}
        )
        feed_url = podcast_info.get("feedUrl", "")
        podcast_name = podcast_info.get("collectionName", "") or podcast_info.get("trackName", "未知播客")

        if not feed_url:
            raise ValueError(f"未能获取播客 RSS 订阅地址（播客 ID: {podcast_id}）")

        # Step 2: fetch RSS
        rss_resp = await client.get(feed_url, headers={"User-Agent": HEADERS["User-Agent"]})
        rss_resp.raise_for_status()

    # Step 3: parse RSS
    root = ET.fromstring(rss_resp.text)
    ns = {"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"}

    items = root.findall(".//item")
    if not items:
        raise ValueError("RSS 中未找到节目内容")

    # Try to match by episode_id (Apple's episode GUID sometimes contains the trackId)
    target_item = None
    if episode_id:
        eid = episode_id.group(1)
        for item in items:
            guid = (item.findtext("guid") or "").strip()
            if eid in guid:
                target_item = item
                break

    # Fall back to first (latest) episode
    if target_item is None:
        target_item = items[0]

    title = target_item.findtext("title") or "未知标题"
    # Prefer <itunes:summary> or <description>
    description = (
        target_item.findtext("itunes:summary", namespaces=ns)
        or target_item.findtext("description")
        or ""
    )
    # Strip HTML tags from description
    description = re.sub(r"<[^>]+>", "", description).strip()

    # Duration
    duration_raw = target_item.findtext("itunes:duration", namespaces=ns)
    duration = duration_raw if duration_raw else None

    if not description:
        raise ValueError("RSS 中未找到节目描述内容")

    return EpisodeMeta(url=url, podcast_name=podcast_name,
                       title=title, description=description, duration=duration)


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
