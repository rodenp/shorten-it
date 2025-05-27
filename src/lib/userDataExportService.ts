import { UserModel, User } from '@/models/User';
import { UserPreferenceModel, UserPreference } from '@/models/UserPreference';
import { ApiKeyModel, ApiKey } from '@/models/ApiKey';
import { CampaignTemplateModel, CampaignTemplate } from '@/models/CampaignTemplate';
import { DomainModel, Domain } from '@/models/Domains';
import { FolderModel, Folder } from '@/models/Folders';
import { LinkGroupModel, LinkGroup } from '@/models/LinkGroup';
import { LinkModel, Link } from '@/models/Link'; // Assuming LinkModel exists, adjust if LinkService is the primary interface
import { SubscriptionModel, Subscription, Plan } from '@/models/Subscription';
import { UserConsentModel, UserConsent, ConsentType } from '@/models/UserConsent';
import { TeamMembershipModel, TeamMembership } from '@/models/TeamMembership'; // Assuming TeamMembershipModel exists

interface UserDataExport {
  profile: Partial<User> | null;
  preferences: Omit<UserPreference, 'userId'> | null;
  apiKeys: Omit<ApiKey, 'hashedKey' | '_id' | 'userId'>[];
  campaignTemplates: Omit<CampaignTemplate, 'userId'>[];
  domains: Omit<Domain, 'userId' | '_id'>[];
  folders: Omit<Folder, 'userId'>[];
  linkGroups: Omit<LinkGroup, 'userId' | '_id'>[];
  links: Omit<Link, 'userId' | '_id'>[];
  subscription: (Omit<Subscription, 'userId'> & { planName?: string | null, features?: string[] }) | null;
  consents: Omit<UserConsent, 'userId' | 'id' | '_id'>[];
  teamMemberships: Omit<TeamMembership, '_id' | 'memberUserId' | 'teamOwnerId'> & { roleContext: 'owner' | 'member', relatedTeamOwnerId?: string, relatedMemberUserId?: string }[];
}

export async function generateUserDataExport(userId: string): Promise<UserDataExport> {
  const exportData: UserDataExport = {
    profile: null,
    preferences: null,
    apiKeys: [],
    campaignTemplates: [],
    domains: [],
    folders: [],
    linkGroups: [],
    links: [],
    subscription: null,
    consents: [],
    teamMemberships: [],
  };

  // Profile
  const userProfile = await UserModel.findById(userId);
  if (userProfile) {
    const { password, _id, ...profileData } = userProfile;
    exportData.profile = { id: userProfile.id || _id?.toHexString(), ...profileData };
  }

  // Preferences
  const userPreferences = await UserPreferenceModel.findByUserId(userId);
  if (userPreferences) {
    const { userId: prefUserId, ...prefsData } = userPreferences;
    exportData.preferences = prefsData;
  }

  // API Keys (Metadata)
  const apiKeysRaw = await ApiKeyModel.findByUserId(userId);
  exportData.apiKeys = apiKeysRaw.map(key => {
    const { userId: apiKeyUserId, hashedKey, _id, ...keyData } = key;
    return { id: key.id || _id?.toHexString(), ...keyData };
  });

  // Campaign Templates
  const campaignTemplatesRaw = await CampaignTemplateModel.findByUserId(userId);
  exportData.campaignTemplates = campaignTemplatesRaw.map(template => {
    const { userId: ctUserId, ...templateData } = template;
    return templateData;
  });

  // Domains
  const domainsRaw = await DomainModel.findByUserId(userId); // Fetches all types
  exportData.domains = domainsRaw.map(domain => {
    const { userId: domainUserId, _id, ...domainData } = domain;
    return { id: domain.id || _id?.toHexString(), ...domainData };
  });

  // Folders
  const foldersRaw = await FolderModel.listByUser(userId);
  exportData.folders = foldersRaw.map(folder => {
    const { userId: folderUserId, ...folderData } = folder; // Assuming id is string or number as per model
    return { ...folderData, id: String(folder.id) }; // Ensure id is string
  });

  // Link Groups
  const linkGroupsRaw = await LinkGroupModel.findByUserId(userId);
  exportData.linkGroups = linkGroupsRaw.map(group => {
    const { userId: lgUserId, _id, ...groupData } = group;
    return { id: group.id || _id?.toHexString(), ...groupData };
  });

  // Links
  // Assuming LinkModel.findByUserId exists. If links are fetched via a LinkService, adjust accordingly.
  // For now, direct model usage is assumed for consistency with other models.
  const linksRaw = await LinkModel.findByUserId(userId); 
  exportData.links = linksRaw.map(link => {
    const { userId: linkUserId, _id, ...linkData } = link;
    // Note: domainName, folderName, groupName are not resolved here yet. Only IDs are included.
    return { id: link.id || _id?.toHexString(), ...linkData };
  });

  // Subscription
  const subscriptionRaw = await SubscriptionModel.getByUserId(userId);
  if (subscriptionRaw) {
    const { userId: subUserId, ...subData } = subscriptionRaw;
    let planName: string | null = null;
    let planFeatures: string[] = [];
    if (subscriptionRaw.planId) {
      const plans = await SubscriptionModel.listPlans(); // This could be cached
      const currentPlan = plans.find(p => p.id === subscriptionRaw.planId);
      planName = currentPlan?.name || null;
      planFeatures = currentPlan?.features || [];
    }
    exportData.subscription = { ...subData, planName, features: planFeatures };
  }

  // User Consents
  const consentsRaw = await UserConsentModel.findAllByUserId(userId);
  exportData.consents = consentsRaw.map(consent => {
    const { id, _id, userId: consentUserId, ...consentData } = consent;
    return consentData; // consentType, isGiven, timestamp
  });
  
  // Team Memberships
  // This assumes TeamMembershipModel.findByUserIdIncludingOwnedTeams(userId) or similar.
  // For simplicity, let's assume two calls: one for memberships, one for owned teams.
  const memberships = await TeamMembershipModel.findByMemberUserId(userId);
  memberships.forEach(tm => {
    const { _id, memberUserId, ...membershipData } = tm;
    exportData.teamMemberships.push({
        ...membershipData,
        id: tm.id || _id?.toHexString(),
        roleContext: 'member',
        relatedTeamOwnerId: tm.teamOwnerId,
        relatedMemberUserId: memberUserId // This is the current user's ID
    });
  });

  const ownedTeams = await TeamMembershipModel.findByTeamOwnerId(userId);
  ownedTeams.forEach(tm => {
    // Avoid duplicating if user is sole member of their own team and it was caught by findByMemberUserId
    // This simple addition might lead to duplicates if user is member of their own team via teamOwnerId also being memberUserId.
    // A more sophisticated approach would merge these results.
    // For now, just adding them, focusing on data presence.
    const { _id, teamOwnerId, ...membershipData } = tm;
     // If the user owns the team AND is also listed as a member in the same record,
     // it might be redundant with the above query.
     // However, findByTeamOwnerId typically returns all members of teams owned by the user.
     // We are interested in the *relationship records* for this user.
     // If tm.memberUserId === userId, it might be a self-membership in an owned team.
    exportData.teamMemberships.push({
        ...membershipData,
        id: tm.id || _id?.toHexString(),
        roleContext: tm.memberUserId === userId ? 'owner_and_member' : 'owner_managing_member', // Clarify context
        relatedTeamOwnerId: teamOwnerId, // This is the current user's ID
        relatedMemberUserId: tm.memberUserId
    });
  });
  // Deduplicate teamMemberships if necessary, based on 'id'
  exportData.teamMemberships = Array.from(new Map(exportData.teamMemberships.map(item => [item.id, item])).values());


  return exportData;
}
