import { DB_TYPE, pool } from '../../scripts/db';
import { SubscriptionModel } from '@/models/Subscription';
import { UserModel } from '@/models/User'; // To fetch user details like image URL

// Import any other necessary services or models, e.g., for file storage
// import { FileStorageService } from './fileStorageService'; // Conceptual

export async function deleteUserAccount(userId: string): Promise<{ success: boolean; message?: string }> {
  // **Authentication/Verification:**
  // This is assumed to have been handled by the API route handler (e.g., password re-entry)
  // before this service function is called. The `userId` is trusted.

  // **1. Subscription Check & Cancellation (Conceptual & Local DB):**
  try {
    const subscription = await SubscriptionModel.getByUserId(userId);
    if (subscription && subscription.planId !== 'free' && subscription.nextBillingDate && new Date(subscription.nextBillingDate) > new Date()) {
      // This checks if the plan is not 'free' and has a future billing date, implying an active paid subscription.
      console.log(`User ${userId} has an active subscription (${subscription.planId}).`);
      // !! CRITICAL TODO !!
      // Implement subscription cancellation with the actual payment provider API (e.g., Stripe, PayPal).
      // This step is crucial to stop future billing.
      // Example: await PaymentProviderService.cancelSubscription(subscription.externalSubscriptionId);
      console.error(`[TODO] User ${userId}: Implement subscription cancellation with [Payment Provider Name] API here. External subscription ID might be: ${JSON.stringify(subscription)}`);
      // If the external cancellation fails, you might want to halt the deletion process to avoid billing a non-existent user.
      // For now, we are proceeding with local data deletion, but in a real scenario, this error should be handled robustly.
    }
    // The local 'subscriptions' table record for this user will be deleted by ON DELETE CASCADE.
  } catch (error) {
    console.error(`[UserService] Error checking/cancelling subscription for user ${userId}:`, error);
    // Depending on policy, might return failure here or log and continue.
    // For now, logging and continuing.
  }

  // **2. (Optional) Delete User Files from Cloud Storage (Conceptual):**
  try {
    const userProfile = await UserModel.findById(userId); // Fetch user to get image URL or other file references
    if (userProfile?.image) {
      // !! CRITICAL TODO !!
      // Implement deletion of the user's image from your cloud storage (e.g., S3, Google Cloud Storage).
      // Example: await FileStorageService.deleteFileByUrl(userProfile.image);
      console.error(`[TODO] User ${userId}: Implement deletion of user image '${userProfile.image}' from [Cloud Storage Service] here.`);
    }
    // Repeat for any other user-specific files stored in cloud services.
  } catch (error) {
    console.error(`[UserService] Error preparing to delete cloud files for user ${userId}:`, error);
    // Log and continue, as this might be non-critical or handled separately.
  }


  // **3. Core User Deletion Execution (PostgreSQL):**
  if (DB_TYPE === 'postgres') {
    if (!pool) {
      console.error('[UserService] PostgreSQL pool not initialized.');
      return { success: false, message: 'Database connection error.' };
    }
    try {
      // The DELETE query on the 'users' table will trigger ON DELETE CASCADE for all linked data.
      const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      if (result.rowCount === 0) {
        console.warn(`[UserService] Attempted to delete user ${userId}, but user not found.`);
        // This could mean the user was already deleted, or the userId is incorrect.
        // Depending on context (e.g. if re-auth happened), this might be an unexpected state.
        return { success: false, message: 'User not found.' };
      }
      
      console.log(`[UserService] User ${userId} and associated data deleted successfully from PostgreSQL.`);
      // Session invalidation for DB-backed sessions in 'sessions' table is handled by ON DELETE CASCADE.
      // For JWTs, rely on short expiry. If NextAuth.js is used with a database adapter, its session records are also cascaded.
      return { success: true, message: 'Account deleted successfully.' };

    } catch (error) {
      console.error(`[UserService] Error during PostgreSQL user deletion for user ${userId}:`, error);
      return { success: false, message: 'An error occurred during account deletion.' };
    }
  } else if (DB_TYPE === 'mongodb') {
    // !! CRITICAL TODO !!
    // Implement manual deletion logic for MongoDB for all relevant collections:
    // e.g., UserModel.delete(userId), ApiKeyModel.deleteManyByUserId(userId), etc.
    // This needs to be comprehensive to achieve full erasure.
    console.error(`[TODO] User ${userId}: MongoDB deletion logic not implemented. This is a critical gap for MongoDB setups.`);
    return { success: false, message: 'Account deletion not fully implemented for the current database type (MongoDB).' };
  } else {
    console.error(`[UserService] Unsupported DB_TYPE: ${DB_TYPE}`);
    return { success: false, message: 'Unsupported database configuration.' };
  }
}
