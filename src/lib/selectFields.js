// src/config/selectFields.js
const SELECT_FIELDS = {
  Accommodation: "_id cityName flagship reviews hotels lat lon address locationLink category roomTypes facilities images premium",
  Activity: "_id cityName reviews topActivities bestPlaces description essentials fee images videos premium",
  CityInfo: "_id cityName stateOrUT alternateNames languagesSpoken climateInfo bestTimeToVisit cityHistory coverImage premium",
  Connectivity: "_id cityName reviews nearestAirportStationBusStand distance lat lon locationLink majorFlightsTrainsBuses premium",
  Food: "_id cityName flagship reviews foodPlace lat lon address locationLink category vegOrNonVeg valueForMoney service taste hygiene menuSpecial menuLink openDay openTime phone website description images videos premium",
  HiddenGem: "_id cityName reviews hiddenGem category lat lon address locationLink openDay openTime guideAvailability establishYear fee description essential story images videos premium",
  Itinerary: "_id cityName reviews day1 day2 day3 premium",
  Misc: "_id cityName reviews localMap emergencyContacts hospital hospitalLocationLink hospitalLat hospitalLon Police PoliceLocationLink PoliceLat PoliceLon parking parkingLocationLink parkingLat parkingLon publicWashrooms publicWashroomsLocationLink publicWashroomsLat publicWashroomsLon locker lockerLocationLink lockerLat lockerLon premium",
  NearbySpot: "_id cityName reviews places distance category lat lon address locationLink openDay openTime establishYear fee description essential story images videos premium",
  Place: "_id cityName reviews places category lat lon address locationLink openDay openTime establishYear fee description essential story images videos premium",
  Shop: "_id cityName flagship reviews shops lat lon address locationLink famousFor priceRange openDay openTime phone website images premium",
  Transport: "_id cityName reviews from to autoPrice cabPrice bikePrice premium",
};

export default SELECT_FIELDS;
