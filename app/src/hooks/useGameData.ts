import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  AncientOnePage,
  AncientOneSetupMeta,
  GameData,
  MapLocation,
  WikiPage,
  AncientOneContext,
  InvestigatorContext,
  InvestigatorSkills,
  StartingEquipment,
  DefeatedEncounters,
} from "../types";

// Type for detailed mystery data from ancient_ones_detailed.json
interface MysteryDetailData {
  name: string;
  ancientOne: string;
  type: string;
  expansion: string;
  flavorText: string;
  mysteryText: string;
  requiresClues: boolean;
  requiresSpells: boolean;
  hasEldritchTokens: boolean;
  requiresArtifact: boolean;
  hasMonster: boolean;
}

// Type for research encounter data from ancient_ones_detailed.json
interface ResearchEncounterData {
  id: string;
  expansion: string;
  description: string;
}

// Type for detailed Ancient One data loaded from ancient_ones_detailed.json
interface AncientOneDetailed {
  name: string;
  titles: string[];
  pageId: number;
  difficulty: string;
  startingDoom: number;
  mythosDeckSize: number;
  mysteries: string;
  set: string;
  requiresSideBoard: string | null;
  notes: string;
  epithet: string;
  shortDescription: string;
  lore: string;
  gameplayRules: string;
  setupInstructions: string;
  awakeningTitle: string;
  awakeningFlavor: string;
  awakeningEffects: string;
  cultistInfo: { raw: string };
  mysteryNames: string[];
  researchEncounters: string;
  mythosDeck: {
    stage1: { green: string; yellow: string; blue: string };
    stage2: { green: string; yellow: string; blue: string };
    stage3: { green: string; yellow: string; blue: string };
  };
  appearance: string;
  residence: string;
  disposition: string;
  antagonists: string;
  source: string;
  // New detailed fields
  mysteryDetails?: MysteryDetailData[];
  researchEncounterDetails?: {
    city: ResearchEncounterData[];
    wilderness: ResearchEncounterData[];
    sea: ResearchEncounterData[];
  };
}

// Type for detailed Investigator data from investigators_detailed.json
interface InvestigatorDetailed {
  name: string;
  pageId: number;
  profession: string;
  role: string;
  set: string;
  skills: InvestigatorSkills;
  health: number;
  sanity: number;
  startingLocation: string;
  startingEquipment: StartingEquipment[];
  personalStory: string;
  quote: string;
  biography: string;
  abilities: string;
  teamRole: string;
  rulings: string;
  origin: string;
  defeatedEncounters: DefeatedEncounters;
}

export function useGameData() {
  const [data, setData] = useState<GameData | null>(null);
  const [ancientOneMeta, setAncientOneMeta] = useState<
    Map<string, AncientOneSetupMeta>
  >(new Map());
  const [ancientOneDetailed, setAncientOneDetailed] = useState<
    Map<string, AncientOneDetailed>
  >(new Map());
  const [investigatorDetailed, setInvestigatorDetailed] = useState<
    Map<string, InvestigatorDetailed>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize meta map from window cache if available
  useEffect(() => {
    // @ts-ignore
    if (window.__ELDRITCH_META__) {
      // @ts-ignore
      const metaJson = window.__ELDRITCH_META__;
      const metaMap = new Map<string, AncientOneSetupMeta>();
      for (const entry of metaJson as Array<
        { titles: string[] } & AncientOneSetupMeta
      >) {
        for (const t of entry.titles) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { titles, ...rest } = entry;
          metaMap.set(t, rest);
        }
      }
      setAncientOneMeta(metaMap);
    }
    // @ts-ignore
    if (window.__ELDRITCH_DETAILED__) {
      // @ts-ignore
      const detailedJson = window.__ELDRITCH_DETAILED__ as AncientOneDetailed[];
      const detailedMap = new Map<string, AncientOneDetailed>();
      for (const entry of detailedJson) {
        detailedMap.set(entry.name, entry);
        // Also index by alternate titles
        for (const t of entry.titles) {
          detailedMap.set(t, entry);
        }
      }
      setAncientOneDetailed(detailedMap);
    }
    // @ts-ignore
    if (window.__ELDRITCH_INVESTIGATORS_DETAILED__) {
      // @ts-ignore
      const invDetailedJson = window.__ELDRITCH_INVESTIGATORS_DETAILED__ as InvestigatorDetailed[];
      const invDetailedMap = new Map<string, InvestigatorDetailed>();
      for (const entry of invDetailedJson) {
        invDetailedMap.set(entry.name, entry);
      }
      setInvestigatorDetailed(invDetailedMap);
    }
  }, []);

  useEffect(() => {
    // Check if data is already loaded in window object (simple cache)
    // @ts-ignore
    if (
      window.__ELDRITCH_DATA__ &&
      window.__ELDRITCH_META__ &&
      window.__ELDRITCH_DETAILED__ &&
      window.__ELDRITCH_INVESTIGATORS_DETAILED__
    ) {
      // @ts-ignore
      setData(window.__ELDRITCH_DATA__);
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/eldritch_horror_data.json").then((res) => {
        if (!res.ok) throw new Error("Failed to load grimoire");
        return res.json();
      }),
      fetch("/ancient_ones_meta.json").then((res) => {
        if (!res.ok) throw new Error("Failed to load ancient one table");
        return res.json();
      }),
      fetch("/ancient_ones_detailed.json?v=2").then((res) => {
        if (!res.ok) throw new Error("Failed to load ancient one details");
        return res.json();
      }),
      fetch("/investigators_detailed.json?v=2").then((res) => {
        if (!res.ok) throw new Error("Failed to load investigator details");
        return res.json();
      }),
    ])
      .then(([json, metaJson, detailedJson, invDetailedJson]) => {
        console.log(`[GameData] Loaded ${invDetailedJson.length} detailed investigators`);
        // @ts-ignore
        window.__ELDRITCH_DATA__ = json;
        // @ts-ignore
        window.__ELDRITCH_META__ = metaJson;
        // @ts-ignore
        window.__ELDRITCH_DETAILED__ = detailedJson;
        // @ts-ignore
        window.__ELDRITCH_INVESTIGATORS_DETAILED__ = invDetailedJson;

        setData(json as GameData);

        const metaMap = new Map<string, AncientOneSetupMeta>();
        for (const entry of metaJson as Array<
          { titles: string[] } & AncientOneSetupMeta
        >) {
          for (const t of entry.titles) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { titles, ...rest } = entry;
            metaMap.set(t, rest);
          }
        }
        setAncientOneMeta(metaMap);

        // Load Ancient One detailed data
        const detailedMap = new Map<string, AncientOneDetailed>();
        for (const entry of detailedJson as AncientOneDetailed[]) {
          detailedMap.set(entry.name, entry);
          for (const t of entry.titles) {
            detailedMap.set(t, entry);
          }
        }
        setAncientOneDetailed(detailedMap);

        // Load Investigator detailed data
        const invDetailedMap = new Map<string, InvestigatorDetailed>();
        for (const entry of invDetailedJson as InvestigatorDetailed[]) {
          invDetailedMap.set(entry.name, entry);
        }
        setInvestigatorDetailed(invDetailedMap);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getInvestigators = (): WikiPage[] => {
    if (!data) return [];
    return data.categories.investigators.sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  };

  const getAncientOnes = (): AncientOnePage[] => {
    if (!data) return [];
    return data.categories.ancientOnes
      .map((ao) => ({ ...ao, setup: ancientOneMeta.get(ao.title) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  const getMonsters = (): WikiPage[] => {
    if (!data) return [];
    return [...data.categories.monsters, ...data.categories.epicMonsters];
  };

  const getImageName = (wikiImageString: string): string | null => {
    if (!wikiImageString) return null;
    const match = wikiImageString.match(/File:([^|\]]+)/);
    if (match) return match[1];
    if (wikiImageString.match(/\.(png|jpg|jpeg|gif)$/i)) {
      return wikiImageString;
    }
    return null;
  };

  const getImageUrl = (wikiPage: WikiPage): string | null => {
    // Placeholder - functionality removed for now
    return null;
  };

  const stripWikiMarkup = (value: string): string => {
    return value
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/'''+/g, "")
      .replace(/''/g, "")
      .trim();
  };

  const getField = (page: WikiPage, key: string): string | null => {
    const direct = page.infobox?.[key];
    if (direct) return stripWikiMarkup(direct);

    // Try to parse from raw wikitext template params: | key = value
    // Capture until newline or next pipe. Best-effort.
    const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n\\r|}]+)`, "i");
    const match = page.rawWikitext?.match(re);
    if (match?.[1]) return stripWikiMarkup(match[1]);

    // Sometimes the scraped fullText starts with template params too.
    const match2 = page.fullText?.match(re);
    if (match2?.[1]) return stripWikiMarkup(match2[1]);

    return null;
  };

  const getStat = (
    page: WikiPage,
    stat:
      | "lore"
      | "influence"
      | "observation"
      | "strength"
      | "will"
      | "health"
      | "sanity"
  ): number => {
    const raw = getField(page, stat);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  };

  // Get all map locations from the World Map category
  const mapLocations = useMemo((): MapLocation[] => {
    if (!data) return [];

    const locations: MapLocation[] = [];

    // Named cities (main locations)
    const namedCities = [
      "London",
      "Rome",
      "Istanbul",
      "Tokyo",
      "Shanghai",
      "Sydney",
      "Arkham",
      "San Francisco",
      "Buenos Aires",
    ];

    // Get all pages from allPages that have "World Map" category
    const allPages = Object.values(data.allPages || {});

    for (const page of allPages) {
      if (!page.categories?.includes("World Map")) continue;

      const title = page.title;
      const typeRaw = page.infobox?.type || page.cardData?.type || "";
      const realWorld = page.infobox?.realworld || "";

      // Determine location type
      let type: "City" | "Sea" | "Wilderness" = "Wilderness";
      if (typeRaw.toLowerCase().includes("city")) type = "City";
      else if (typeRaw.toLowerCase().includes("sea")) type = "Sea";

      // Build display name
      let displayName = title;
      if (title.startsWith("Space ") && realWorld) {
        // For numbered spaces, show real world name
        const cleanRealWorld = stripWikiMarkup(realWorld).split(",")[0]; // Just first part
        displayName = `${cleanRealWorld} (${title})`;
      }

      locations.push({
        id: title,
        name: displayName,
        type,
        realWorld: realWorld ? stripWikiMarkup(realWorld) : undefined,
      });
    }

    // Sort: Named cities first, then by title
    return locations.sort((a, b) => {
      const aIsNamed = namedCities.includes(a.id);
      const bIsNamed = namedCities.includes(b.id);
      if (aIsNamed && !bIsNamed) return -1;
      if (!aIsNamed && bIsNamed) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  // Get all encounter cards organized by category
  const encounters = useMemo(() => {
    if (!data)
      return {
        general: [],
        location: [],
        research: [],
        otherWorld: [],
        expedition: [],
        mysticRuins: [],
        dreamQuest: [],
        devastation: [],
        special: [],
        combat: [],
        other: [],
      };

    return data.categories.encounters;
  }, [data]);

  // Flat list of all encounters with category labels
  const allEncounters = useMemo(() => {
    if (!data) return [];

    const enc = data.categories.encounters;
    const otherPages = enc.other || [];

    // Find specific pages from the "other" category
    const generalEncPage = otherPages.find(
      (p) => p.title === "General Encounter"
    );
    const locationEncPage = otherPages.find(
      (p) => p.title === "Location Encounter"
    );
    const combatEncPage = otherPages.find(
      (p) => p.title === "Combat Encounter"
    );

    // Create separate cards for City, Sea, Wilderness from General Encounter page
    const cityCard: WikiPage[] = [];
    const seaCard: WikiPage[] = [];
    const wildernessCard: WikiPage[] = [];
    if (generalEncPage) {
      const content =
        generalEncPage.sections?.["General Encounter Cards"] ||
        generalEncPage.fullText ||
        "";
      cityCard.push({
        ...generalEncPage,
        title: "City Encounters",
        fullText: content,
      } as WikiPage);
      seaCard.push({
        ...generalEncPage,
        title: "Sea Encounters",
        pageId: generalEncPage.pageId + 1000,
        fullText: content,
      } as WikiPage);
      wildernessCard.push({
        ...generalEncPage,
        title: "Wilderness Encounters",
        pageId: generalEncPage.pageId + 2000,
        fullText: content,
      } as WikiPage);
    }

    // Create virtual cards for each Location region
    const locationCards: WikiPage[] = [];
    if (locationEncPage && locationEncPage.sections) {
      Object.entries(locationEncPage.sections).forEach(
        ([sectionName, content], idx) => {
          if (sectionName !== "References" && content) {
            locationCards.push({
              ...locationEncPage,
              title: sectionName,
              pageId: locationEncPage.pageId + 3000 + idx,
              fullText: content as string,
            } as WikiPage);
          }
        }
      );
    }

    // Combat encounters - use actual monster data instead of the rules page
    const monsters = data.categories.monsters || [];
    const epicMonsters = data.categories.epicMonsters || [];
    const ancientOnes = data.categories.ancientOnes || [];

    // Combat sub-categories
    const combatSubCategories: WikiPage[] = [
      {
        title: "Monsters",
        pageId: -1,
        categories: [],
        infobox: {},
        cardData: {},
        sections: {},
        links: [],
        templates: [],
        fullText: `${monsters.length} monsters`,
        rawWikitext: "",
      },
      {
        title: "Epic Monsters",
        pageId: -2,
        categories: [],
        infobox: {},
        cardData: {},
        sections: {},
        links: [],
        templates: [],
        fullText: `${epicMonsters.length} epic monsters`,
        rawWikitext: "",
      },
      {
        title: "Ancient Ones",
        pageId: -3,
        categories: [],
        infobox: {},
        cardData: {},
        sections: {},
        links: [],
        templates: [],
        fullText: `${ancientOnes.length} ancient ones`,
        rawWikitext: "",
      },
    ];

    // Single placeholder card for general encounters
    const generalCard: WikiPage[] = [
      {
        title: "General Encounter",
        pageId: -10,
        categories: [],
        infobox: {},
        cardData: {},
        sections: {},
        links: [],
        templates: [],
        fullText: "City, Sea, or Wilderness encounter based on location",
        rawWikitext: "",
      },
    ];

    const result: {
      category: string;
      label: string;
      cards: WikiPage[];
      subCategories?: { [key: string]: WikiPage[] };
    }[] = [
      { category: "general", label: "General Encounter", cards: generalCard },
      {
        category: "locationRegion",
        label: "Location Encounters",
        cards: locationCards,
      },
      {
        category: "combat",
        label: "Combat Encounter",
        cards: combatSubCategories,
        subCategories: {
          Monsters: monsters,
          "Epic Monsters": epicMonsters,
          "Ancient Ones": ancientOnes,
        },
      },
      {
        category: "research",
        label: "Research Encounters",
        cards: enc.research,
      },
      {
        category: "otherWorld",
        label: "Other World Encounters",
        cards: enc.otherWorld.map((ow) => ({
          ...ow,
          title: ow.title,
          fullText: `${ow.title} - Select to generate encounter`,
        })),
        subCategories: Object.fromEntries(
          enc.otherWorld.map((ow) => [ow.title, [ow]])
        ),
      },
      {
        category: "expedition",
        label: "Expedition Encounters",
        cards: enc.expedition,
      },
      {
        category: "devastation",
        label: "Devastation Encounters",
        cards: enc.devastation,
      },
      { category: "special", label: "Special Encounters", cards: enc.special },
    ];

    return result.filter((cat) => cat.cards.length > 0);
  }, [data]);

  /**
   * Extract Ancient One context for the plot generation API
   * Uses detailed pre-extracted data when available, otherwise falls back to wiki parsing
   * Includes full mystery details and research encounters for rich AI context
   */
  const extractAncientOneContext = useCallback(
    (ao: WikiPage): AncientOneContext => {
      // First, try to get from pre-extracted detailed data
      const detailed = ancientOneDetailed.get(ao.title);
      if (detailed) {
        return {
          // Identity
          name: detailed.name,
          epithet: detailed.epithet,
          shortDescription: detailed.shortDescription,
          set: detailed.set,
          
          // Full lore and backstory
          lore: detailed.lore,
          appearance: detailed.appearance,
          residence: detailed.residence,
          disposition: detailed.disposition,
          antagonists: detailed.antagonists,
          source: detailed.source,
          
          // Gameplay mechanics
          abilities: detailed.gameplayRules,
          setupInstructions: detailed.setupInstructions,
          difficulty: detailed.difficulty,
          startingDoom: detailed.startingDoom,
          mythosDeckSize: detailed.mythosDeckSize,
          mythosDeck: detailed.mythosDeck,
          cultistInfo: detailed.cultistInfo?.raw || '',
          
          // Awakening/Defeat
          awakeningTitle: detailed.awakeningTitle,
          awakeningFlavor: detailed.awakeningFlavor,
          awakeningEffects: detailed.awakeningEffects,
          
          // Mysteries - both names and full details with flavor text and requirements
          mysteryNames: detailed.mysteryNames || [],
          mysteryDetails: detailed.mysteryDetails?.map(m => ({
            name: m.name,
            type: m.type,
            expansion: m.expansion,
            flavorText: m.flavorText,
            mysteryText: m.mysteryText,
            requiresClues: m.requiresClues,
            requiresSpells: m.requiresSpells,
            hasEldritchTokens: m.hasEldritchTokens,
            requiresArtifact: m.requiresArtifact,
            hasMonster: m.hasMonster,
          })),
          
          // Research encounters - full card descriptions for AI context
          researchEncounterSummary: detailed.researchEncounters,
          researchEncounterDetails: detailed.researchEncounterDetails ? {
            city: detailed.researchEncounterDetails.city || [],
            wilderness: detailed.researchEncounterDetails.wilderness || [],
            sea: detailed.researchEncounterDetails.sea || [],
          } : undefined,
        };
      }

      // Fallback to wiki parsing if detailed data not available
      // Try multiple section keys for lore content
      const loreSection =
        ao.sections?.["Lore"] ||
        ao.sections?.["The Daemon Sultan"] ||
        ao.sections?.["The Great Dreamer"] ||
        ao.sections?.["The Black Goat"] ||
        ao.sections?.["The King in Yellow"] ||
        Object.entries(ao.sections || {}).find(
          ([key]) => key.includes("Description") || key.includes("Overview")
        )?.[1] ||
        "";

      // Get gameplay and abilities
      const gameplaySection =
        ao.sections?.["Gameplay"] || ao.sections?.["Gameplay "] || "";

      // Get mysteries list
      const mysteriesSection = ao.sections?.["Mysteries"] || "";
      const mysteryMatches =
        mysteriesSection.match(/\|([^|]+?)\n\|([A-Za-z ]+)\n\|/g) || [];
      const mysteries = mysteryMatches
        .map((m) => {
          const parts = m.split("\n|");
          return parts[1]?.trim() || "";
        })
        .filter(Boolean);

      // Fallback: extract mystery names from links if section parsing failed
      if (mysteries.length === 0 && ao.links) {
        const mysteryKeywords = [
          "Research",
          "Mystery",
          "Omen",
          "Flame",
          "Name",
          "Voice",
          "Seed",
        ];
        mysteries.push(
          ...ao.links
            .filter((link) =>
              mysteryKeywords.some((keyword) => link.includes(keyword))
            )
            .slice(0, 6)
        );
      }

      // Get research encounters section
      const researchSection = ao.sections?.["Research Encounters"] || "";

      // Get defeat/awakening condition (flavor text from infobox)
      const defeatCondition =
        ao.infobox?.["flavor"] ||
        ao.infobox?.["title"] ||
        ao.cardData?.["flavor"] ||
        "";

      // Get epithet from first section that's not a standard section
      const epithet =
        Object.keys(ao.sections || {}).find(
          (key) =>
            ![
              "Gameplay",
              "Setup",
              "Cultists",
              "Mysteries",
              "Research Encounters",
              "Lore",
              "References",
              "Strategy",
            ].includes(key)
        ) || "";

      return {
        name: ao.title,
        epithet,
        shortDescription: stripWikiMarkup(ao.sections?.[epithet] || "").slice(0, 500),
        lore: stripWikiMarkup(loreSection).slice(0, 2000),
        abilities: stripWikiMarkup(gameplaySection).slice(0, 1500),
        mysteryNames: mysteries,
        researchEncounterSummary: stripWikiMarkup(researchSection).slice(0, 1000),
        awakeningFlavor: stripWikiMarkup(defeatCondition).slice(0, 500),
      };
    },
    [ancientOneDetailed]
  );

  /**
   * Extract Investigator context for the plot generation API
   * Uses detailed pre-extracted data when available, otherwise falls back to wiki parsing
   * Includes full context: skills, quote, team role, rulings, defeated encounters
   */
  const extractInvestigatorContext = useCallback(
    (inv: WikiPage): InvestigatorContext => {
      // First, try to get from pre-extracted detailed data
      const detailed = investigatorDetailed.get(inv.title);
      if (detailed) {
        return {
          // Identity
          name: detailed.name,
          profession: detailed.profession,
          role: detailed.role,
          set: detailed.set,

          // Stats
          skills: detailed.skills,
          health: detailed.health,
          sanity: detailed.sanity,

          // Starting info
          startingLocation: detailed.startingLocation,
          startingEquipment: detailed.startingEquipment,
          personalStory: detailed.personalStory,

          // Narrative content
          quote: detailed.quote,
          biography: detailed.biography,
          abilities: detailed.abilities,
          teamRole: detailed.teamRole,
          rulings: detailed.rulings,
          origin: detailed.origin,

          // Defeated encounters
          defeatedEncounters: detailed.defeatedEncounters,
        };
      }

      // Fallback to wiki parsing if detailed data not available
      // Get biography - try multiple section keys
      const biographySection =
        inv.sections?.["Biography"] ||
        inv.sections?.["Bio"] ||
        inv.sections?.["Flavor Text"] ||
        "";

      // Get abilities section
      const profession =
        getField(inv, "profession") ||
        getField(inv, "occupation") ||
        "Investigator";

      const abilitiesSection =
        inv.sections?.["Abilities"] ||
        inv.sections?.["The " + stripWikiMarkup(profession)] ||
        "";

      // Get personal story name
      const personalStory = getField(inv, "personal_story") || "";

      // Get starting location
      const startingLocation = getField(inv, "startloc") || "Unknown";

      // Get role
      const role = getField(inv, "role") || "";

      // Get team role section
      const teamRole = inv.sections?.["Team Role"] || "";

      // Get rulings section
      const rulings =
        inv.sections?.["Rulings, clarifications, and reminders"] ||
        inv.sections?.["Rulings, Clarifications, and Reminders"] ||
        "";

      // Get quote from Flavor Text section
      const flavorSection = inv.sections?.["Flavor Text"] || "";
      const quoteMatch = flavorSection.match(/["']([^"']{10,})["']/);
      const quote = quoteMatch ? quoteMatch[1] : "";

      // Extract stats from fullText
      const fullText = inv.fullText || "";
      const extractStat = (key: string): number => {
        const match = fullText.match(new RegExp(`\\|${key}\\s*=\\s*(\\d+)`, "i"));
        return match ? parseInt(match[1], 10) : 0;
      };

      return {
        name: inv.title,
        profession: stripWikiMarkup(profession),
        role: stripWikiMarkup(role),
        set: stripWikiMarkup(getField(inv, "set") || ""),
        skills: {
          lore: extractStat("lore"),
          influence: extractStat("influence"),
          observation: extractStat("observation"),
          strength: extractStat("strength"),
          will: extractStat("will"),
        },
        health: extractStat("health"),
        sanity: extractStat("sanity"),
        startingLocation: stripWikiMarkup(startingLocation),
        startingEquipment: [], // Cannot reliably extract from wiki format in fallback
        personalStory: stripWikiMarkup(personalStory),
        quote: stripWikiMarkup(quote),
        biography: stripWikiMarkup(biographySection).slice(0, 1500),
        abilities: stripWikiMarkup(abilitiesSection).slice(0, 1000),
        teamRole: stripWikiMarkup(teamRole).slice(0, 1000),
        rulings: stripWikiMarkup(rulings).slice(0, 1000),
        origin: stripWikiMarkup(inv.sections?.["Origin"] || ""),
        defeatedEncounters: {
          lossOfHealth: "",
          lossOfSanity: "",
        },
      };
    },
    [investigatorDetailed]
  );

  return {
    loading,
    error,
    investigators: getInvestigators(),
    ancientOnes: getAncientOnes(),
    monsters: getMonsters(),
    mapLocations,
    encounters,
    allEncounters,
    allData: data,
    helpers: {
      getImageName,
      getImageUrl,
      stripWikiMarkup,
      getField,
      getStat,
      extractAncientOneContext,
      extractInvestigatorContext,
    },
  };
}
