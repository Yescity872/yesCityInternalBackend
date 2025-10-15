import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Contribution from '@/models/Contribution';
import { withAuth } from '@/middleware/auth';
import { getContributionAwardPoints } from '@/lib/contributionPoints';

export const PATCH = withAuth(async (req) => {
  try {
    const { userId } = req.user;
    const body = await req.json();
    const { contributionId } = body;

    if (!contributionId) {
      return new Response(
        JSON.stringify({ error: 'contributionId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await connectToDatabase();

    const contribution = await Contribution.findById(contributionId);

    if (!contribution) {
      return new Response(
        JSON.stringify({ error: 'Contribution not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (contribution.userId.toString() !== userId.toString()) {
      return new Response(
        JSON.stringify({ error: 'You are not allowed to claim points for this contribution' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (contribution.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Contribution must be approved before points can be claimed' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (contribution.pointsAwarded) {
      return new Response(
        JSON.stringify({ error: 'Points already awarded for this contribution' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const awardPoints = getContributionAwardPoints(contribution.status);

    if (awardPoints <= 0) {
      return new Response(
        JSON.stringify({ error: 'No points configured for this contribution status' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const storedMonth = user.pointsMonth?.getMonth();
    const storedYear = user.pointsMonth?.getFullYear();

    if (storedMonth !== currentMonth || storedYear !== currentYear) {
      user.monthlyPoints = 0;
      user.pointsMonth = now;
    }

    const MONTHLY_CAP = 90;
    const remainingCap = Math.max(0, MONTHLY_CAP - user.monthlyPoints);

    if (remainingCap <= 0) {
      return new Response(
        JSON.stringify({ error: 'Monthly limit reached, no points added' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pointsToApply = Math.min(awardPoints, remainingCap);

    user.monthlyPoints += pointsToApply;
    user.contributionPoints += pointsToApply;

    contribution.pointsAwarded = true;
    contribution.pointsAwardedAt = new Date();

    await Promise.all([user.save(), contribution.save()]);

    return new Response(
      JSON.stringify({
        message: 'Contribution points updated',
        addedPoints: pointsToApply,
        monthlyPoints: user.monthlyPoints,
        contributionPoints: user.contributionPoints,
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


