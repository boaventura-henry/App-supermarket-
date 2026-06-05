import { prisma } from "../prisma";

export type LocalIdentity = {
  legacyId: string;
  email: string;
  name: string;
};

export async function ensureProfile(identity: LocalIdentity) {
  return prisma.profile.upsert({
    where: { legacyId: identity.legacyId },
    create: {
      legacyId: identity.legacyId,
      email: identity.email,
      name: identity.name
    },
    update: {
      email: identity.email,
      name: identity.name
    },
    select: {
      id: true,
      legacyId: true,
      email: true,
      name: true
    }
  });
}
