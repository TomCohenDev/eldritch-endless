import { useState, useEffect, useMemo } from 'react';
import type { AncientOnePage, AncientOneSetupMeta, GameData, MapLocation, WikiPage } from '../types';

export function useGameData() {
  const [data, setData] = useState<GameData | null>(null);
  const [ancientOneMeta, setAncientOneMeta] = useState<Map<string, AncientOneSetupMeta>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if data is already loaded in window object (simple cache)
    // @ts-ignore
    if (window.__ELDRITCH_DATA__) {
      // @ts-ignore
      setData(window.__ELDRITCH_DATA__);
      setLoading(false);
      return;
    }

    Promise.all([
      fetch('/eldritch_horror_data.json').then(res => {
        if (!res.ok) throw new Error('Failed to load grimoire');
        return res.json();
      }),
      fetch('/ancient_ones_meta.json').then(res => {
        if (!res.ok) throw new Error('Failed to load ancient one table');
        return res.json();
      }),
    ])
      .then(([json, metaJson]) => {
        // @ts-ignore
        window.__ELDRITCH_DATA__ = json;
        setData(json as GameData);

        const metaMap = new Map<string, AncientOneSetupMeta>();
        for (const entry of metaJson as Array<{ titles: string[] } & AncientOneSetupMeta>) {
          for (const t of entry.titles) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { titles, ...rest } = entry;
            metaMap.set(t, rest);
          }
        }
        setAncientOneMeta(metaMap);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
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
    return [
      ...data.categories.monsters,
      ...data.categories.epicMonsters
    ];
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
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/'''+/g, '')
      .replace(/''/g, '')
      .trim();
  };

  const getField = (page: WikiPage, key: string): string | null => {
    const direct = page.infobox?.[key];
    if (direct) return stripWikiMarkup(direct);

    // Try to parse from raw wikitext template params: | key = value
    // Capture until newline or next pipe. Best-effort.
    const re = new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n\\r|}]+)`, 'i');
    const match = page.rawWikitext?.match(re);
    if (match?.[1]) return stripWikiMarkup(match[1]);

    // Sometimes the scraped fullText starts with template params too.
    const match2 = page.fullText?.match(re);
    if (match2?.[1]) return stripWikiMarkup(match2[1]);

    return null;
  };

  const getStat = (
    page: WikiPage,
    stat: 'lore' | 'influence' | 'observation' | 'strength' | 'will' | 'health' | 'sanity'
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
      'London', 'Rome', 'Istanbul', 'Tokyo', 'Shanghai', 
      'Sydney', 'Arkham', 'San Francisco', 'Buenos Aires'
    ];
    
    // Get all pages from allPages that have "World Map" category
    const allPages = Object.values(data.allPages || {});
    
    for (const page of allPages) {
      if (!page.categories?.includes('World Map')) continue;
      
      const title = page.title;
      const typeRaw = page.infobox?.type || page.cardData?.type || '';
      const realWorld = page.infobox?.realworld || '';
      
      // Determine location type
      let type: 'City' | 'Sea' | 'Wilderness' = 'Wilderness';
      if (typeRaw.toLowerCase().includes('city')) type = 'City';
      else if (typeRaw.toLowerCase().includes('sea')) type = 'Sea';
      
      // Build display name
      let displayName = title;
      if (title.startsWith('Space ') && realWorld) {
        // For numbered spaces, show real world name
        const cleanRealWorld = stripWikiMarkup(realWorld).split(',')[0]; // Just first part
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
    if (!data) return {
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
    const generalEncPage = otherPages.find(p => p.title === 'General Encounter');
    const locationEncPage = otherPages.find(p => p.title === 'Location Encounter');
    const combatEncPage = otherPages.find(p => p.title === 'Combat Encounter');
    
    // Create separate cards for City, Sea, Wilderness from General Encounter page
    const cityCard: WikiPage[] = [];
    const seaCard: WikiPage[] = [];
    const wildernessCard: WikiPage[] = [];
    if (generalEncPage) {
      const content = generalEncPage.sections?.['General Encounter Cards'] || generalEncPage.fullText || '';
      cityCard.push({
        ...generalEncPage,
        title: 'City Encounters',
        fullText: content,
      } as WikiPage);
      seaCard.push({
        ...generalEncPage,
        title: 'Sea Encounters', 
        pageId: generalEncPage.pageId + 1000,
        fullText: content,
      } as WikiPage);
      wildernessCard.push({
        ...generalEncPage,
        title: 'Wilderness Encounters',
        pageId: generalEncPage.pageId + 2000,
        fullText: content,
      } as WikiPage);
    }
    
    // Create virtual cards for each Location region
    const locationCards: WikiPage[] = [];
    if (locationEncPage && locationEncPage.sections) {
      Object.entries(locationEncPage.sections).forEach(([sectionName, content], idx) => {
        if (sectionName !== 'References' && content) {
          locationCards.push({
            ...locationEncPage,
            title: sectionName,
            pageId: locationEncPage.pageId + 3000 + idx,
            fullText: content as string,
          } as WikiPage);
        }
      });
    }
    
    // Combat encounters - use actual monster data instead of the rules page
    const monsters = data.categories.monsters || [];
    const epicMonsters = data.categories.epicMonsters || [];
    const ancientOnes = data.categories.ancientOnes || [];
    
    // Combat sub-categories
    const combatSubCategories: WikiPage[] = [
      { title: 'Monsters', pageId: -1, categories: [], infobox: {}, cardData: {}, sections: {}, links: [], templates: [], fullText: `${monsters.length} monsters`, rawWikitext: '' },
      { title: 'Epic Monsters', pageId: -2, categories: [], infobox: {}, cardData: {}, sections: {}, links: [], templates: [], fullText: `${epicMonsters.length} epic monsters`, rawWikitext: '' },
      { title: 'Ancient Ones', pageId: -3, categories: [], infobox: {}, cardData: {}, sections: {}, links: [], templates: [], fullText: `${ancientOnes.length} ancient ones`, rawWikitext: '' },
    ];

    const result: { category: string; label: string; cards: WikiPage[]; subCategories?: { [key: string]: WikiPage[] } }[] = [
      { category: 'city', label: 'City Encounters', cards: cityCard },
      { category: 'sea', label: 'Sea Encounters', cards: seaCard },
      { category: 'wilderness', label: 'Wilderness Encounters', cards: wildernessCard },
      { category: 'locationRegion', label: 'Location Encounters', cards: locationCards },
      { 
        category: 'combat', 
        label: 'Combat Encounter', 
        cards: combatSubCategories,
        subCategories: {
          'Monsters': monsters,
          'Epic Monsters': epicMonsters,
          'Ancient Ones': ancientOnes,
        }
      },
      { category: 'research', label: 'Research Encounters', cards: enc.research },
      { category: 'otherWorld', label: 'Other World Encounters', cards: enc.otherWorld },
      { category: 'expedition', label: 'Expedition Encounters', cards: enc.expedition },
      { category: 'mysticRuins', label: 'Mystic Ruins Encounters', cards: enc.mysticRuins },
      { category: 'dreamQuest', label: 'Dream Quest Encounters', cards: enc.dreamQuest },
      { category: 'devastation', label: 'Devastation Encounters', cards: enc.devastation },
      { category: 'special', label: 'Special Encounters', cards: enc.special },
    ];
    
    return result.filter(cat => cat.cards.length > 0);
  }, [data]);

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
    }
  };
}

