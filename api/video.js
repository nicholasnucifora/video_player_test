export default async function handler(req, res) {
  const { id, commentsPage } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing video id' });

  const key = process.env.GOOGLE_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  try {
    // If commentsPage is provided, only fetch the next page of comments
    if (commentsPage) {
      const commentsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${id}&maxResults=20&order=relevance&pageToken=${commentsPage}&key=${key}`
      ).catch(() => null);
      const commentsData = commentsRes ? await commentsRes.json() : { items: [] };
      const comments = (commentsData.items || []).map((c) => {
        const s = c.snippet.topLevelComment.snippet;
        return { author: s.authorDisplayName, avatar: s.authorProfileImageUrl, text: s.textDisplay, likes: s.likeCount, date: s.publishedAt };
      });
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      return res.json({ comments, nextPageToken: commentsData.nextPageToken || null });
    }

    // Fetch video snippet + contentDetails + comments in parallel
    const [videoRes, commentsRes] = await Promise.all([
      fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${key}`
      ),
      fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${id}&maxResults=20&order=relevance&key=${key}`
      ).catch(() => null),
    ]);

    const videoData = await videoRes.json();
    const commentsData = commentsRes ? await commentsRes.json() : { items: [] };

    if (!videoData.items?.length) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const item = videoData.items[0];
    const snippet = item.snippet;

    // Get channel info for the avatar
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${snippet.channelId}&key=${key}`
    );
    const channelData = await channelRes.json();
    const channelThumb = channelData.items?.[0]?.snippet?.thumbnails?.default?.url ?? '';

    const comments = (commentsData.items || []).map((c) => {
      const s = c.snippet.topLevelComment.snippet;
      return {
        author: s.authorDisplayName,
        avatar: s.authorProfileImageUrl,
        text: s.textDisplay,
        likes: s.likeCount,
        date: s.publishedAt,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.json({
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      channelAvatar: channelThumb,
      duration: item.contentDetails.duration,
      commentCount: item.statistics?.commentCount || 0,
      comments,
      nextPageToken: commentsData.nextPageToken || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
