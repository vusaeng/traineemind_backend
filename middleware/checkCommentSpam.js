// Middleware to check for spam
export const checkCommentSpam = async (req, res, next) => {
  try {
    const { email, content } = req.body;

    // Check for too many comments from same email in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentComments = await Content.aggregate([
      { $unwind: "$comments" },
      {
        $match: {
          "comments.email": email.toLowerCase(),
          "comments.createdAt": { $gte: oneHourAgo },
        },
      },
      { $count: "count" },
    ]);

    if (recentComments[0]?.count >= 5) {
      return res.status(429).json({
        error: "Too many comments. Please try again later.",
      });
    }

    // Check for common spam keywords
    const spamKeywords = [
      "buy now",
      "click here",
      "cheap",
      "discount",
      "viagra",
    ];
    const hasSpam = spamKeywords.some((keyword) =>
      content.toLowerCase().includes(keyword)
    );

    if (hasSpam) {
      return res.status(400).json({
        error: "Comment contains prohibited content",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
