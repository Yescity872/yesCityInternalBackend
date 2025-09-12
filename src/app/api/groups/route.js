import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Group from "@/models/Group";
import City from "@/models/City";
import { getUserFromCookies } from '@/middleware/auth';

export async function GET(request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');

    try {
        const query = {};
        if (city) {
            const cityDoc = await City.findOne({ cityName: city });
            if (cityDoc) {
                query.city = cityDoc._id;
            } else {
                return NextResponse.json({ success: false, message: "City not found" }, { status: 404 });
            }
        }

        const groups = await Group.find(query).populate('city', 'cityName').populate('members', 'name');
        // If city was requested and no groups exist yet, create default public groups
        if (city && (!groups || groups.length === 0)) {
            const cityDoc = await City.findOne({ cityName: city });
            if (cityDoc) {
                const defaults = [
                    { name: `${city} Open Chat`, description: `Open city chat for ${city}`, privacy: 'Public', city: cityDoc._id },
                    { name: `${city} - Places`, description: `Discuss places in ${city}`, privacy: 'Public', city: cityDoc._id },
                    { name: `${city} - Food`, description: `Share food spots in ${city}`, privacy: 'Public', city: cityDoc._id },
                    { name: `${city} - Hotels`, description: `Hotel recommendations for ${city}`, privacy: 'Public', city: cityDoc._id },
                ];
                await Group.insertMany(defaults.map(d => ({ ...d, members: [] })));
                const populated = await Group.find({ city: cityDoc._id }).populate('city', 'cityName').populate('members', 'username');
                return NextResponse.json({ success: true, data: populated });
            }
        }
        return NextResponse.json({ success: true, data: groups });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const { name, description, city, privacy } = body;

        if (!name || !city) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const cityDoc = await City.findOne({ cityName: city });
        if (!cityDoc) {
            return NextResponse.json({ success: false, message: "City not found" }, { status: 404 });
        }

        // derive user from cookies / server-side auth
        const user = await getUserFromCookies();
        if (!user || !user.userId) {
            return NextResponse.json({ success: false, message: "User not authenticated" }, { status: 401 });
        }

        const newGroup = new Group({
            name,
            description,
            city: cityDoc._id,
            privacy,
            createdBy: user.userId,
            members: [user.userId] // Creator is the first member
        });

        await newGroup.save();
        const populated = await Group.findById(newGroup._id).populate('city', 'cityName').populate('members', 'username');
        return NextResponse.json({ success: true, data: populated }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    await dbConnect();
    try {
        const { action, groupId } = await request.json();
            if (!action || !groupId) {
                return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
            }

            // derive user from cookies
            const user = await getUserFromCookies();
            if (!user || !user.userId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            const userId = user.userId;

            const group = await Group.findById(groupId);
            if (!group) return NextResponse.json({ success: false, message: 'Group not found' }, { status: 404 });

            const handleJoin = (grp, uid) => {
                if (grp.privacy === 'Public') {
                    if (!grp.members.includes(uid)) {
                        grp.members.push(uid);
                        return true;
                    }
                    return false;
                }

                if (!grp.pendingRequests.includes(uid)) {
                    grp.pendingRequests.push(uid);
                    return true;
                }
                return false;
            };

            const handleApprove = (grp, uid) => {
                const idx = grp.pendingRequests.indexOf(uid);
                if (idx === -1) return false;
                grp.pendingRequests.splice(idx, 1);
                if (!grp.members.includes(uid)) grp.members.push(uid);
                return true;
            };

            const handleLeave = (grp, uid) => {
                const idx = grp.members.indexOf(uid);
                if (idx === -1) return false;
                grp.members.splice(idx, 1);
                // also remove from pending requests if present
                const pidx = grp.pendingRequests.indexOf(uid);
                if (pidx !== -1) grp.pendingRequests.splice(pidx, 1);
                return true;
            };

            let changed = false;

            if (action === 'join') {
                changed = handleJoin(group, userId);
            } else if (action === 'approve') {
                changed = handleApprove(group, userId);
            } else if (action === 'leave') {
                changed = handleLeave(group, userId);
            } else {
                return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 });
            }

            if (changed) await group.save();
            const populated = await Group.findById(groupId).populate('city', 'cityName').populate('members', 'username');
            return NextResponse.json({ success: true, data: populated });
        } catch (error) {
            console.error('Groups PUT error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
