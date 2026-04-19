import type { RepositoryDatabase } from "../sqlite";
import { createCompanionsRepo } from "./companionsRepo";
import { createMemoriesRepo } from "./memoriesRepo";
import { createMessagesRepo } from "./messagesRepo";
import { createMilestonesRepo } from "./milestonesRepo";
import { createRelationshipStateRepo } from "./relationshipStateRepo";
import { createResponseInfluencesRepo } from "./responseInfluencesRepo";

export function createRepositories(db: RepositoryDatabase) {
  return {
    messages: createMessagesRepo(db),
    memories: createMemoriesRepo(db),
    relationshipState: createRelationshipStateRepo(db),
    responseInfluences: createResponseInfluencesRepo(db),
    companions: createCompanionsRepo(db),
    milestones: createMilestonesRepo(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
