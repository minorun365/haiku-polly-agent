"""AWS What's New RSS フィードを取得するツール"""

import urllib.request
import xml.etree.ElementTree as ET
from strands import tool


AWS_WHATS_NEW_RSS = "https://aws.amazon.com/about-aws/whats-new/recent/feed/"


@tool
def get_aws_news(keyword: str = "") -> str:
    """AWS What's Newの最新ニュースを取得します。キーワードで絞り込むこともできます。

    Args:
        keyword: 検索キーワード（空の場合は最新5件を返す）

    Returns:
        最新のAWSニュースの要約
    """
    try:
        req = urllib.request.Request(
            AWS_WHATS_NEW_RSS,
            headers={"User-Agent": "VoiceAgent/1.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            xml_data = resp.read()

        root = ET.fromstring(xml_data)
        items = root.findall(".//item")

        results = []
        for item in items:
            title = item.findtext("title", "")
            pub_date = item.findtext("pubDate", "")
            description = item.findtext("description", "")

            # HTMLタグを除去
            description = _strip_html(description)
            # 長すぎる場合は切り詰め
            if len(description) > 200:
                description = description[:200] + "..."

            if keyword and keyword.lower() not in (title + description).lower():
                continue

            results.append(f"{title} ({pub_date})\n{description}")

            if len(results) >= 5:
                break

        if not results:
            return f"「{keyword}」に一致するAWSニュースは見つかりませんでした。" if keyword else "ニュースの取得に失敗しました。"

        header = f"AWS What's New（キーワード: {keyword}）" if keyword else "AWS What's New 最新ニュース"
        return f"{header}\n\n" + "\n\n".join(results)

    except Exception as e:
        return f"AWSニュースの取得中にエラーが発生しました: {e}"


def _strip_html(text: str) -> str:
    """簡易的にHTMLタグを除去"""
    import re
    clean = re.sub(r"<[^>]+>", "", text)
    clean = clean.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return clean.strip()
