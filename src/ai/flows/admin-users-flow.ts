
'use server';
/**
 * @fileOverview Admin user management flows.
 * - getUsers: Fetches all users for the admin panel.
 * - updateUserByAdmin: Updates a user's details.
 * - deleteUserByAdmin: Deletes a user.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { type UserProfile as DBUserProfileType } from '@/types'; // To reflect DB structure
import { ObjectId } from 'mongodb';


// Schema for user data returned to admin panel (subset of UserProfile)
const UserForAdminOutputSchema = z.object({
  id: z.string().describe("User's unique identifier."),
  name: z.string().describe("User's full name."),
  email: z.string().email().describe("User's email address."),
  avatarUrl: z.string().url().optional().nullable().describe("URL of the user's avatar image."),
  role: z.enum(['user', 'admin']).describe("User's role in the system."),
  createdAt: z.string().datetime().describe("Date and time when the user registered (ISO 8601 format)."),
  dataAiHint: z.string().optional().nullable().describe("AI hint for the avatar image placeholder."),
});
export type UserForAdminOutput = z.infer<typeof UserForAdminOutputSchema>;

const GetUsersOutputSchema = z.array(UserForAdminOutputSchema);
export type GetUsersOutput = z.infer<typeof GetUsersOutputSchema>;


// --- Schemas for Update ---
const UpdateUserByAdminInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.enum(['user', 'admin']).optional(),
  avatarUrl: z.string().url("Invalid URL for avatar").optional().nullable(),
});
export type UpdateUserByAdminInput = z.infer<typeof UpdateUserByAdminInputSchema>;

const UpdateUserByAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: UserForAdminOutputSchema.optional().nullable(),
});
export type UpdateUserByAdminOutput = z.infer<typeof UpdateUserByAdminOutputSchema>;


// --- Schemas for Delete ---
const DeleteUserByAdminInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
export type DeleteUserByAdminInput = z.infer<typeof DeleteUserByAdminInputSchema>;

const DeleteUserByAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserByAdminOutput = z.infer<typeof DeleteUserByAdminOutputSchema>;



// Get Users Flow
export async function getUsers(): Promise<GetUsersOutput> {
  return getUsersFlow({});
}

const getUsersFlow = ai.defineFlow(
  {
    name: 'getUsersFlow',
    inputSchema: z.object({}), // No input needed to get all users
    outputSchema: GetUsersOutputSchema,
  },
  async () => {
    try {
      const { db } = await connectToDatabase();
      // Specify the type for the collection, excluding password in projection.
      const usersCollection = db.collection<Omit<DBUserProfileType, 'password'>>('users');

      const usersFromDb = await usersCollection
        .find({}, { projection: { password: 0 } }) // Explicitly exclude password field
        .sort({ createdAt: -1 })
        .toArray();

      const usersForAdmin: UserForAdminOutput[] = usersFromDb.map(userDoc => {
        // The userDoc from MongoDB might have _id as ObjectId and createdAt as Date
        // We need to transform these for the Zod schema
        const doc = userDoc as any; // Use 'as any' for flexible access to DB fields before validation
        return {
          id: doc._id.toString(),
          name: doc.name || 'N/A',
          email: doc.email || 'N/A',
          avatarUrl: doc.avatarUrl || null,
          role: doc.role || 'user', // Default to 'user' if role is missing
          // Ensure createdAt is a valid ISO string, provide a fallback for safety
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
          dataAiHint: doc.dataAiHint || null,
        };
      });

      // The array is validated against GetUsersOutputSchema
      return usersForAdmin;

    } catch (error: any) {
      console.error("Error fetching users for admin panel:", error);
      // Return empty array on error to prevent breaking the admin page entirely
      return [];
    }
  }
);


// --- Flow for Updating User ---
export async function updateUserByAdmin(input: UpdateUserByAdminInput): Promise<UpdateUserByAdminOutput> {
  return updateUserByAdminFlow(input);
}

const updateUserByAdminFlow = ai.defineFlow(
  {
    name: 'updateUserByAdminFlow',
    inputSchema: UpdateUserByAdminInputSchema,
    outputSchema: UpdateUserByAdminOutputSchema,
  },
  async ({ userId, ...updateData }) => {
    try {
      if (!ObjectId.isValid(userId)) {
        return { success: false, message: 'Invalid User ID format.' };
      }

      const { db } = await connectToDatabase();
      const usersCollection = db.collection<DBUserProfileType>('users');

      const updatePayload: Partial<DBUserProfileType> = {};
      if (updateData.name) updatePayload.name = updateData.name;
      if (updateData.email) updatePayload.email = updateData.email;
      if (updateData.role) updatePayload.role = updateData.role;
      if (updateData.avatarUrl !== undefined) updatePayload.avatarUrl = updateData.avatarUrl ?? undefined;

      if (Object.keys(updatePayload).length === 0) {
        return { success: false, message: 'No update data provided.' };
      }

      const result = await usersCollection.findOneAndUpdate(
        { _id: new ObjectId(userId) as any },
        { $set: updatePayload },
        { returnDocument: 'after', projection: { password: 0 } }
      );

      if (result) {
        const updatedUserDoc = result;
        const updatedUser: UserForAdminOutput = {
          id: updatedUserDoc._id.toString(),
          name: updatedUserDoc.name || 'N/A',
          email: updatedUserDoc.email || 'N/A',
          avatarUrl: updatedUserDoc.avatarUrl || null,
          role: updatedUserDoc.role || 'user',
          createdAt: (updatedUserDoc as any).createdAt ? new Date((updatedUserDoc as any).createdAt).toISOString() : new Date(0).toISOString(),
          dataAiHint: updatedUserDoc.dataAiHint || null,
        };
        return { success: true, message: 'User updated successfully.', user: updatedUser };
      }
      return { success: false, message: 'User not found or failed to update.' };

    } catch (error: any) {
      console.error('Error updating user by admin:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
);


// --- Flow for Deleting User ---
export async function deleteUserByAdmin(input: DeleteUserByAdminInput): Promise<DeleteUserByAdminOutput> {
  return deleteUserByAdminFlow(input);
}

const deleteUserByAdminFlow = ai.defineFlow(
  {
    name: 'deleteUserByAdminFlow',
    inputSchema: DeleteUserByAdminInputSchema,
    outputSchema: DeleteUserByAdminOutputSchema,
  },
  async ({ userId }) => {
    try {
      if (!ObjectId.isValid(userId)) {
        return { success: false, message: 'Invalid User ID format.' };
      }
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) as any });

      if (result.deletedCount === 1) {
        return { success: true, message: 'User deleted successfully.' };
      }
      return { success: false, message: 'User not found or already deleted.' };

    } catch (error: any) {
      console.error('Error deleting user by admin:', error);
      return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
  }
);
