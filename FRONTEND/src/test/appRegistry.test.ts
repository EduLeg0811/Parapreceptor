import { describe, expect, it } from "vitest";
import {
  ACTION_ALIASES_BY_SEMANTIC_ID,
  ACTION_REGISTRY,
  getSectionItems,
  resolveActionAlias,
  resolveSemanticActionId,
} from "@/features/ghost-writer/config/appRegistry";

describe("app registry", () => {
  it("keeps app aliases sequential and unique", () => {
    const aliases = ACTION_REGISTRY.map((item) => item.alias);

    expect(new Set(aliases).size).toBe(34);
    expect(aliases).toEqual(Array.from({ length: 34 }, (_, index) => `app${index + 1}`));
  });

  it("maps semantic ids to the standardized aliases", () => {
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.macro1).toBe("app1");
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.macro2).toBe("app2");
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.dictionary).toBe("app3");
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.ai_command).toBe("app18");
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.definologia).toBe("app19");
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.busca_semantica).toBe("app29");
    expect(ACTION_ALIASES_BY_SEMANTIC_ID.biblio_externa).toBe("app34");
  });

  it("resolves aliases and semantic ids to the same action", () => {
    expect(resolveSemanticActionId("app29")).toBe("busca_semantica");
    expect(resolveActionAlias("busca_semantica")).toBe("app29");
    expect(resolveSemanticActionId("busca_semantica")).toBe("busca_semantica");
  });

  it("groups items by frontpage section", () => {
    expect(getSectionItems("document").map((item) => item.alias)).toEqual(["app1", "app2"]);
    expect(getSectionItems("actions").map((item) => item.semanticId)).toEqual(["dictionary", "synonyms", "antonyms", "etymology", "cognatos"]);
    expect(getSectionItems("semantic_search").map((item) => item.semanticId)).toEqual(["busca_semantica", "semantic_overview"]);
    expect(getSectionItems("bibliografia").map((item) => item.alias)).toEqual(["app31", "app32", "app33", "app34"]);
  });
});
