import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const PATCH = withAuth(async (req) => {
  try {
    const userId = req.user.userId; // from withAuth
    const body = await req.json();
    const { contributionPoints } = body;

    if (contributionPoints === undefined) {
      return new Response(
        JSON.stringify({ error: 'contributionPoints is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await connectToDatabase();
    const user = await User.findById(userId);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const storedMonth = user.pointsMonth?.getMonth();
    const storedYear = user.pointsMonth?.getFullYear();

    // Reset if new month
    if (storedMonth !== currentMonth || storedYear !== currentYear) {
      user.monthlyPoints = 0;
      user.pointsMonth = now;
    }

    // Enforce monthly cap of 90 (no error, just skip adding more)
    let addedPoints = 0;
    if (user.monthlyPoints < 90) {
      const available = 90 - user.monthlyPoints;
      addedPoints = Math.min(contributionPoints, available);

      user.monthlyPoints += addedPoints;
      user.contributionPoints += addedPoints;
      await user.save();
    }

    return new Response(
      JSON.stringify({
        message: addedPoints > 0
          ? 'Contribution points updated'
          : 'Monthly limit reached, no points added',
        contributionPoints: user.contributionPoints,
        monthlyPoints: user.monthlyPoints,
        addedPoints,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating contribution points:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});



// -------------------- GET User Contribution Points --------------------
// export const GET = withAuth(async (req) => {
//   try {
//     const userId = req.user.userId; // from withAuth

//     await connectToDatabase();

//     const user = await User.findById(userId).select('contributionPoints');

//     if (!user) {
//       return new Response(
//         JSON.stringify({ error: 'User not found' }),
//         { status: 404, headers: { 'Content-Type': 'application/json' } }
//       );
//     }

//     return new Response(
//       JSON.stringify({ contributionPoints: user.contributionPoints }),
//       { status: 200, headers: { 'Content-Type': 'application/json' } }
//     );
//   } catch (error) {
//     console.error('Error fetching contribution points:', error);
//     return new Response(
//       JSON.stringify({ error: 'Internal Server Error' }),
//       { status: 500, headers: { 'Content-Type': 'application/json' } }
//     );
//   }
// });


