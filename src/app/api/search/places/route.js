import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import City from '@/models/City';

// Import all your existing place models
import PlacesToVisit from '@/models/CityRoutes/Place';
import Food from '@/models/CityRoutes/Food';
import Accommodation from '@/models/CityRoutes/Accommodation';
import Activity from '@/models/CityRoutes/Activity';
import Shop from '@/models/CityRoutes/Shop';
import HiddenGem from '@/models/CityRoutes/HiddenGem';
import NearbySpot from '@/models/CityRoutes/NearbySpot';

// Levenshtein Distance Algorithm for fuzzy matching
function calculateLevenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Calculate fuzzy match score
function fuzzyScore(query, target) {
  if (!target) return 0;
  const distance = calculateLevenshteinDistance(query.toLowerCase(), target.toLowerCase());
  const maxLength = Math.max(query.length, target.length);
  return (maxLength - distance) / maxLength;
}

// Define search configurations for each collection
const searchConfigs = [
  {
    model: PlacesToVisit,
    type: 'tourist_attraction',
    searchFields: ['places', 'category', 'description', 'address'],
    displayName: (item) => item.places
  },
  {
    model: Food,
    type: 'restaurant',
    searchFields: ['foodPlace', 'category', 'description', 'address'],
    displayName: (item) => item.foodPlace
  },
  {
    model: Accommodation,
    type: 'hotel',
    searchFields: ['hotels', 'category', 'roomTypes', 'facilities', 'address'],
    displayName: (item) => item.hotels
  },
  {
    model: Activity,
    type: 'activity',
    searchFields: ['topActivities', 'bestPlaces', 'description'],
    displayName: (item) => item.topActivities
  },
  {
    model: Shop,
    type: 'shop',
    searchFields: ['shops', 'famousFor', 'address'],
    displayName: (item) => item.shops
  },
  {
    model: HiddenGem,
    type: 'hidden_gem',
    searchFields: ['hiddenGem', 'category', 'description', 'address'],
    displayName: (item) => item.hiddenGem
  },
  {
    model: NearbySpot,
    type: 'nearby_spot',
    searchFields: ['places', 'category', 'description', 'address'],
    displayName: (item) => item.places
  }
];

// Function to search across multiple collections
async function searchInCollection(config, query, matchType, limit) {
  const { model, searchFields } = config;
  
  let searchQuery = {};
  
  if (matchType === 'exact') {
    // Exact prefix match
    searchQuery = {
      $or: searchFields.map(field => ({
        [field]: { $regex: `^${query}`, $options: 'i' }
      }))
    };
  } else if (matchType === 'contains') {
    // Contains match
    searchQuery = {
      $or: searchFields.map(field => ({
        [field]: { $regex: query, $options: 'i' }
      }))
    };
  }
  
  try {
    const results = await model.find(searchQuery)
      .populate('cityId', 'cityName')
      .limit(limit)
      .lean();
    
    return results.map(item => ({
      _id: item._id,
      placeName: config.displayName(item),
      cityName: item.cityName || item.cityId?.cityName,
      cityId: item.cityId?._id || item.cityId,
      placeType: config.type,
      matchType,
      address: item.address,
      category: item.category,
      coordinates: {
        lat: item.lat,
        lon: item.lon
      },
      originalData: item
    }));
  } catch (error) {
    console.error(`Error searching in ${config.type}:`, error);
    return [];
  }
}

// Helper function to get score based on match type
function getScoreByMatchType(matchType) {
  switch (matchType) {
    case 'exact': return 1.0;
    case 'contains': return 0.8;
    case 'fuzzy': return 0.6;
    default: return 0.5;
  }
}

// Function to perform fuzzy search
async function fuzzySearchInCollection(config, query, threshold = 0.6) {
  const { model } = config;
  
  try {
    // Get a broader set of data for fuzzy matching
    const allItems = await model.find({})
      .populate('cityId', 'cityName')
      .limit(100) // Limit for performance
      .lean();
    
    const fuzzyResults = allItems
      .map(item => {
        const itemName = config.displayName(item);
        const cityName = item.cityName || item.cityId?.cityName;
        
        const nameScore = fuzzyScore(query, itemName);
        const cityScore = cityName ? fuzzyScore(query, cityName) : 0;
        const categoryScore = item.category ? fuzzyScore(query, item.category) : 0;
        
        const maxScore = Math.max(nameScore, cityScore, categoryScore);
        
        return {
          ...item,
          fuzzyScore: maxScore,
          placeName: itemName,
          cityName: cityName,
          placeType: config.type
        };
      })
      .filter(item => item.fuzzyScore > threshold)
      .sort((a, b) => b.fuzzyScore - a.fuzzyScore);
    
    return fuzzyResults.map(item => ({
      _id: item._id,
      placeName: item.placeName,
      cityName: item.cityName,
      cityId: item.cityId?._id || item.cityId,
      placeType: item.placeType,
      matchType: 'fuzzy',
      score: item.fuzzyScore,
      address: item.address,
      category: item.category,
      coordinates: {
        lat: item.lat,
        lon: item.lon
      },
      originalData: item
    }));
  } catch (error) {
    console.error(`Error in fuzzy search for ${config.type}:`, error);
    return [];
  }
}
export async function GET(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Return empty if query is too short
    if (!query || query.length < 2) {
      return NextResponse.json({ 
        success: true,
        data: [], 
        total: 0,
        message: "Query too short" 
      });
    }

    let allResults = [];

    // Stage 0: City matches FIRST (highest priority)
    const cityMatches = await City.find({
      cityName: { $regex: query, $options: 'i' }
    })
    .select('cityName')
    .limit(5); // Limit cities to top 5

    const cityResults = cityMatches.map(city => ({
      _id: city._id,
      cityName: city.cityName,
      placeName: null,
      cityId: city._id,
      placeType: 'city',
      matchType: city.cityName.toLowerCase().startsWith(query.toLowerCase()) ? 'exact' : 'contains',
      score: city.cityName.toLowerCase().startsWith(query.toLowerCase()) ? 1.0 : 0.8,
      displayText: city.cityName,
      type: 'city'
    }));

    allResults.push(...cityResults);

    // Stage 1: Exact prefix matches for places
    if (allResults.length < limit) {
      const remainingLimit = limit - allResults.length;
      const exactLimit = Math.ceil(remainingLimit / 2);
      
      for (const config of searchConfigs) {
        const exactResults = await searchInCollection(config, query, 'exact', exactLimit);
        allResults.push(...exactResults);
      }
    }

    // Stage 2: Contains matches (if we need more results)
    if (allResults.length < limit) {
      const remainingLimit = limit - allResults.length;
      const containsLimit = Math.ceil(remainingLimit / 2);
      
      for (const config of searchConfigs) {
        const containsResults = await searchInCollection(config, query, 'contains', containsLimit);
        // Filter out duplicates based on _id
        const newResults = containsResults.filter(
          result => !allResults.some(existing => existing._id.toString() === result._id.toString())
        );
        allResults.push(...newResults);
      }
    }

    // Stage 3: Fuzzy matches (if we still need more results and query is long enough)
    if (allResults.length < limit && query.length >= 3) {
      const remainingLimit = limit - allResults.length;
      let fuzzyResults = [];
      
      for (const config of searchConfigs) {
        const configFuzzyResults = await fuzzySearchInCollection(config, query, 0.6);
        fuzzyResults.push(...configFuzzyResults);
      }
      
      // Remove duplicates and sort by fuzzy score
      const uniqueFuzzyResults = fuzzyResults
        .filter(result => !allResults.some(existing => existing._id.toString() === result._id.toString()))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, remainingLimit);
      
      allResults.push(...uniqueFuzzyResults);
    }

    // Helper function for sorting
    const getSortPriority = (item) => {
      if (item.type === 'city') {
        return item.matchType === 'exact' ? 1 : 2; // Cities: exact=1, contains=2
      }
      // Places: exact=3, contains=4, fuzzy=5
      switch (item.matchType) {
        case 'exact': return 3;
        case 'contains': return 4;
        case 'fuzzy': return 5;
        default: return 6;
      }
    };

    // Final sorting and formatting
    const finalResults = allResults
      .sort((a, b) => {
        // Sort by priority first (cities before places, exact before contains)
        const aPriority = getSortPriority(a);
        const bPriority = getSortPriority(b);
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Then by score within same priority
        const aScore = a.score || getScoreByMatchType(a.matchType);
        const bScore = b.score || getScoreByMatchType(b.matchType);
        
        return bScore - aScore;
      })
      .slice(0, limit)
      .map(result => ({
        _id: result._id,
        placeName: result.placeName,
        cityName: result.cityName,
        cityId: result.cityId,
        placeType: result.placeType,
        matchType: result.matchType,
        score: result.score || getScoreByMatchType(result.matchType),
        displayText: result.placeName ? `${result.placeName}, ${result.cityName}` : result.cityName,
        type: result.type || 'place',
        address: result.address,
        category: result.category,
        coordinates: result.coordinates
      }));

    return NextResponse.json({
      success: true,
      data: finalResults,
      total: finalResults.length,
      query,
      searchStages: {
        exact: finalResults.filter(r => r.matchType === 'exact').length,
        contains: finalResults.filter(r => r.matchType === 'contains').length,
        fuzzy: finalResults.filter(r => r.matchType === 'fuzzy').length
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Search failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}