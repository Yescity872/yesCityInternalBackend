import CategoryEngagement from "@/models/CategoryEngagement";


export async function recordCategoryEngagement(user, cityName, categoryName) {
  if (!user) return; // skip if no user

  const userId = user.userId;

  let category = await CategoryEngagement.findOne({
    cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
    category: categoryName,
  });

  if (!category) {
    category = new CategoryEngagement({
      cityName,
      category: categoryName,
      engagement: { views: 0, viewedBy: [] },
    });
  }

  category.engagement.views += 1;

  const viewedEntry = category.engagement.viewedBy.find(
    (v) => v.userId.toString() === userId.toString()
  );

  if (viewedEntry) {
    viewedEntry.timestamps.push(new Date());
  } else {
    category.engagement.viewedBy.push({ userId, timestamps: [new Date()] });
  }

  await category.save();
}
