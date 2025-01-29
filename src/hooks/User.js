import User from "../models/User";
import moment from 'moment';

export async function createUser(userId) {
  const newUser = new User({
    userId: userId,
    isActive: true,
    lastActiveAt: new Date(),
  });

  try {
    await newUser.save();
    return newUser;
  } catch (err) {
    console.error('Error creating user:', err);
  }
}

export async function updateUserActivity(userId) {
  try {
    const user = await User.findOne({ userId: userId });

    if (user) {
      user.lastActiveAt = new Date();
      await user.save();
      console.log('User activity updated');
    } else {
      console.log('User not found');
    }
  } catch (err) {
    console.error('Error updating user activity:', err);
  }
}

export async function countTotalUsers() {
  try {
    const activeUsers = await User.countDocuments();
    return activeUsers;
  } catch (err) {
    console.error('Error counting active users:', err);
  }
}

export async function countActiveUsers() {
  try {
    const startOfDay = moment().startOf('day').toDate();
    const activeUsers = await User.countDocuments({
      lastActiveAt: { $gte: startOfDay }
    });
    return activeUsers;
  } catch (err) {
    console.error('Error counting active users by last activity:', err);
  }
}

export async function isUserExisted(userId) {
  try {
    const user = await User.findOne({ userId: userId });
    return user !== null;
  } catch (err) {
    console.error('Error checking if user exists:', err);
    return false;
  }
}
