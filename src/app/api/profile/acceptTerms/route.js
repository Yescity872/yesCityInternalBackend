import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const PATCH = withAuth(async (req) => {
  try {
    const userId = req.user.userId; // From withAuth middleware

    await connectToDatabase();

    // Update only that field
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { acceptConnectTandC: true },
      { new: true }
    ).select('_id username email acceptConnectTandC');

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        message: 'Terms and Conditions accepted successfully.',
        user: updatedUser,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating T&C:', error);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
